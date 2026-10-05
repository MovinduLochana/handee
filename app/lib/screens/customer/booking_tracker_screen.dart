import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/models/agent_workflow_model.dart';
import '../../data/models/booking_model.dart';
import '../../data/models/invoice_model.dart';
import '../../providers/booking_provider.dart';
import '../../providers/job_request_provider.dart';
import '../../providers/payment_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/invoice_payment_sheet.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/urgency_badge.dart';
import '../../widgets/write_review_bottom_sheet.dart';

class BookingTrackerScreen extends StatefulWidget {
  const BookingTrackerScreen({super.key});

  @override
  State<BookingTrackerScreen> createState() => _BookingTrackerScreenState();
}

class _BookingTrackerScreenState extends State<BookingTrackerScreen> {
  Timer? _pollingTimer;
  int _pollCount = 0;
  bool _showAgentSteps = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<JobRequestProvider>();
      provider.refreshTrackedRequest();
      context.read<PaymentProvider>().fetchMyInvoices();
      context.read<BookingProvider>().fetchCustomerBookings();
      _startPolling();
    });
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(milliseconds: 2500), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }
      _pollCount++;
      final provider = context.read<JobRequestProvider>();
      final request = provider.currentTrackedRequest;

      final bookingProvider = context.read<BookingProvider>();
      final matching = bookingProvider.bookings.cast<BookingModel?>().firstWhere(
        (b) => b?.jobRequestId == request?.id,
        orElse: () => null,
      );

      // Stop rapid polling once request is Cancelled, or booking is Accepted, or after 30 polls (~75s)
      if (request != null && (request.isCancelled || (matching != null && matching.isAccepted) || _pollCount >= 30)) {
        timer.cancel();
      }

      await provider.refreshTrackedRequest();
      if (!mounted) return;
      await context.read<BookingProvider>().fetchCustomerBookings();
      if (!mounted) return;
      await context.read<PaymentProvider>().fetchMyInvoices();
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<JobRequestProvider>();
    final bookingProvider = context.watch<BookingProvider>();
    final request = provider.currentTrackedRequest ??
        (provider.requests.isNotEmpty ? provider.requests.first : null);
    final workflow = provider.currentWorkflow;

    if (request == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Live Status Tracker')),
        body: const Center(child: Text('No active job request to track')),
      );
    }

    final matchingBooking = bookingProvider.bookings.cast<BookingModel?>().firstWhere(
      (b) => b?.jobRequestId == request.id,
      orElse: () => null,
    );

    final isProviderAccepted = matchingBooking != null && (matchingBooking.isAccepted || matchingBooking.isInProgress);
    final isProviderDeclined = matchingBooking != null && (matchingBooking.isDeclined || matchingBooking.isExpired);
    final isProviderCompleted = matchingBooking != null && matchingBooking.isCompleted;
    final providerName = matchingBooking?.providerName ?? workflow?.selectedProviderName ?? 'Matched Provider';

    final isPendingReview = request.isPendingAiReview;
    final isOpen = request.isOpen;
    final isCancelled = request.isCancelled;
    final isAiComplete = workflow != null || isOpen;
    final isHumanApprovalRequired = workflow?.isRequiresHumanApproval ?? false;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Live Status Tracker'),
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Refresh status',
            icon: const Icon(Icons.refresh),
            onPressed: () {
              provider.refreshTrackedRequest();
              context.read<BookingProvider>().fetchCustomerBookings();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Request Header Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        request.categoryName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                      ),
                      StatusBadge(status: request.status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    request.description,
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  const Divider(color: AppColors.borderLight, height: 1),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_on, size: 14, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Text(
                            request.cleanLocation.isNotEmpty
                                ? request.cleanLocation.split(',').first
                                : request.location.split(',').first,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                      UrgencyBadge(urgency: request.urgency),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Live Workflow Progress Timeline
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Workflow Progress',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                if (!isAiComplete && isPendingReview)
                  const Row(
                    children: [
                      SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                      ),
                      SizedBox(width: 6),
                      Text('AI analyzing...', style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600)),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 12),

            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                children: [
                  _buildTimelineStep(
                    icon: Icons.check_circle,
                    title: '1. Request Submitted',
                    subtitle: 'Request persisted to PostgreSQL database',
                    isDone: true,
                    isActive: false,
                  ),
                  _buildTimelineLine(isDone: isAiComplete),
                  _buildTimelineStep(
                    icon: isAiComplete ? Icons.check_circle : Icons.hourglass_top,
                    title: isAiComplete ? '2. Multi-Agent AI Analysis Complete' : '2. Multi-Agent AI Analysis',
                    subtitle: isAiComplete
                        ? 'Domain, Action, Price & Safety agents evaluated'
                        : 'Domain Analysis & Action agents validating scope and price bands...',
                    isDone: isAiComplete,
                    isActive: !isAiComplete && isPendingReview,
                  ),
                  _buildTimelineLine(isDone: isOpen && isProviderAccepted),
                  _buildTimelineStep(
                    icon: isCancelled
                        ? Icons.cancel_outlined
                        : (isOpen
                            ? (isProviderAccepted
                                ? Icons.check_circle
                                : (isProviderDeclined
                                    ? Icons.sync_problem_rounded
                                    : Icons.access_time_rounded))
                            : (isHumanApprovalRequired ? Icons.shield_outlined : Icons.radio_button_unchecked)),
                    title: isCancelled
                        ? '3. Request Cancelled'
                        : (isOpen
                            ? (isProviderAccepted
                                ? '3. Provider Accepted & Confirmed'
                                : (isProviderDeclined
                                    ? '3. Provider Unavailable'
                                    : '3. Dispatched — Awaiting Acceptance'))
                            : (isHumanApprovalRequired ? '3. Queued for Admin Review' : '3. Open for Matching')),
                    subtitle: isCancelled
                        ? 'This request was cancelled'
                        : (isOpen
                            ? (isProviderAccepted
                                ? '$providerName accepted your request! Service confirmed.'
                                : (isProviderDeclined
                                    ? 'The provider was unable to accept. AI is finding another match...'
                                    : 'Offer dispatched to $providerName — waiting for provider to accept'))
                            : (isHumanApprovalRequired
                                ? 'AI safety check flagged variance. Staff will verify shortly.'
                                : 'Awaiting the outcome of AI review')),
                    isDone: isOpen && isProviderAccepted,
                    isActive: (isOpen && !isProviderAccepted && !isCancelled) || (isHumanApprovalRequired && isPendingReview),
                    iconColorOverride: isCancelled
                        ? AppColors.error
                        : (isOpen
                            ? (isProviderAccepted
                                ? AppColors.success
                                : (isProviderDeclined ? AppColors.error : AppColors.warning))
                            : (isHumanApprovalRequired && isPendingReview ? Colors.amber.shade700 : null)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // AI Agent Analysis Details Card
            if (workflow != null) ...[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primaryLight.withOpacity(0.5)),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.smart_toy_outlined, size: 20, color: AppColors.primary),
                            SizedBox(width: 8),
                            Text(
                              'AI Analysis Result',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                            ),
                          ],
                        ),
                        _buildTierBadge(workflow),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('AI Estimated Price:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                        Text(
                          'Rs. ${(workflow.estimatedPrice ?? 3500.0).toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                      ],
                    ),
                    if (workflow.selectedProviderName != null && workflow.selectedProviderName!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Matched Provider:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                          Text(
                            workflow.selectedProviderName!,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    InkWell(
                      onTap: () {
                        setState(() {
                          _showAgentSteps = !_showAgentSteps;
                        });
                      },
                      child: Row(
                        children: [
                          Icon(
                            _showAgentSteps ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                            size: 18,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _showAgentSteps ? 'Hide 4-Agent Execution Logs' : 'View 4-Agent Execution Logs (${workflow.stepLogs.length} steps)',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                    if (_showAgentSteps) ...[
                      const SizedBox(height: 10),
                      const Divider(height: 1),
                      const SizedBox(height: 10),
                      ...workflow.stepLogs.map((step) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 20,
                                  height: 20,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryUltraLight,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppColors.primaryLight),
                                  ),
                                  child: Text('${step.stepNumber}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        step.agentName,
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                                      ),
                                      Text(
                                        'Action: ${step.action} (${step.durationMs}ms)',
                                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          )),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Dispatched & Provider Acceptance Status
            if (isOpen) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isProviderAccepted
                      ? AppColors.surface
                      : (isProviderDeclined ? AppColors.errorLight : AppColors.warningLight),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isProviderAccepted
                        ? AppColors.success.withOpacity(0.4)
                        : (isProviderDeclined
                            ? AppColors.error.withOpacity(0.4)
                            : AppColors.warning.withOpacity(0.4)),
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      isProviderAccepted
                          ? Icons.check_circle_outline
                          : (isProviderDeclined ? Icons.error_outline : Icons.schedule_send_rounded),
                      color: isProviderAccepted
                          ? AppColors.success
                          : (isProviderDeclined ? AppColors.error : AppColors.warning),
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        isProviderAccepted
                            ? 'Provider accepted! Your booking is confirmed with $providerName.'
                            : (isProviderDeclined
                                ? 'The matched provider was unavailable. Our AI system is re-matching your request with another qualified professional.'
                                : 'Request dispatched to $providerName! Waiting for the provider to accept the request before the booking is confirmed.'),
                        style: TextStyle(
                          fontSize: 12,
                          color: isProviderAccepted
                              ? AppColors.textSecondary
                              : (isProviderDeclined ? AppColors.error : AppColors.warning),
                          height: 1.4,
                          fontWeight: isProviderAccepted ? FontWeight.normal : FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Itemized Quote & Payment Card (Payments & Invoicing Component)
              Builder(
                builder: (context) {
                  final paymentProvider = context.watch<PaymentProvider>();
                  final currencyFmt = NumberFormat('#,##0.00', 'en_US');

                  final bookingProvider = context.watch<BookingProvider>();
                  BookingModel? linkedBooking;
                  for (final b in bookingProvider.bookings) {
                    if (b.jobRequestId == request.id) {
                      linkedBooking = b;
                      break;
                    }
                  }
                  final targetBookingId = linkedBooking?.id ?? request.id;
                  final double rawBase = (linkedBooking?.price ?? workflow?.estimatedPrice ?? 3500.0).toDouble();
                  final double mult = () {
                    switch (request.urgency.toLowerCase()) {
                      case 'emergency': return 1.40;
                      case 'high': return 1.20;
                      case 'medium': return 1.05;
                      case 'low': return 0.95;
                      default: return 1.0;
                    }
                  }();
                  final double totalVal = (linkedBooking?.price != null || workflow?.estimatedPrice != null)
                      ? rawBase
                      : (rawBase * mult).roundToDouble();
                  final double baseVal = (totalVal * 0.85).roundToDouble();
                  final double feeVal = (totalVal - baseVal).roundToDouble();
                  final double standardTotal = mult > 0 ? (totalVal / mult).roundToDouble() : totalVal;
                  final double standardLabor = (standardTotal * 0.85).roundToDouble();
                  final double urgencySurchargeVal = (baseVal - standardLabor).roundToDouble();

                  final invoice = paymentProvider.getInvoiceForBooking(targetBookingId) ??
                      paymentProvider.getInvoiceForBooking(request.id) ??
                      InvoiceModel(
                        id: 'inv-${request.id.substring(0, min(8, request.id.length))}',
                        bookingId: targetBookingId,
                        customerId: request.customerId,
                        customerName: 'Customer',
                        providerId: workflow?.selectedProviderId ?? 'prov-001',
                        providerName: workflow?.selectedProviderName ?? 'Matched Provider',
                        baseAmount: baseVal,
                        platformFee: feeVal,
                        totalAmount: totalVal,
                        urgencySurcharge: urgencySurchargeVal,
                        status: 'Issued',
                        adminApprovalStatus: 'AutoApproved',
                        createdAt: DateTime.now(),
                      );

                  final isPaid = invoice.isPaid;

                  return Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isPaid ? AppColors.success.withOpacity(0.3) : AppColors.primaryLight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isPaid
                              ? AppColors.success.withOpacity(0.04)
                              : AppColors.primary.withOpacity(0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.receipt_long, size: 20, color: AppColors.primary),
                                SizedBox(width: 8),
                                Text(
                                  'Itemized Quote & Invoice',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isPaid ? AppColors.successLight : AppColors.primaryUltraLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                isPaid ? 'PAID' : 'ISSUED',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: isPaid ? AppColors.success : AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        ...invoice.lineItems.map((item) {
                          final isUrgency = item.type?.toLowerCase() == 'urgency' ||
                              item.item.toLowerCase().contains('priority') ||
                              item.item.toLowerCase().contains('surcharge');
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    children: [
                                      if (isUrgency) ...[
                                        const Icon(Icons.bolt, size: 14, color: Color(0xFFF59E0B)),
                                        const SizedBox(width: 4),
                                      ],
                                      Flexible(
                                        child: Text(
                                          item.item,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: isUrgency ? FontWeight.w700 : FontWeight.w500,
                                            color: isUrgency ? const Color(0xFFD97706) : AppColors.textSecondary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${isUrgency && item.price > 0 ? "+" : ""}Rs. ${currencyFmt.format(item.price)}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isUrgency ? FontWeight.w700 : FontWeight.w600,
                                    color: isUrgency ? const Color(0xFFD97706) : AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                        const SizedBox(height: 6),
                        const Divider(height: 1),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total Amount:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                            Text('Rs. ${currencyFmt.format(invoice.totalAmount)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary)),
                          ],
                        ),
                        if (!isPaid) ...[
                          const SizedBox(height: 16),
                          if (!isProviderAccepted) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: AppColors.warningLight,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.warning.withOpacity(0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.info_outline, size: 16, color: AppColors.warning),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Payment unlocks once $providerName accepts the booking request.',
                                      style: const TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ] else ...[
                            CustomButton(
                              text: 'Pay Securely Now',
                              icon: Icons.lock_outline,
                              onPressed: () {
                                showModalBottomSheet(
                                  context: context,
                                  isScrollControlled: true,
                                  backgroundColor: Colors.transparent,
                                  builder: (_) => InvoicePaymentSheet(
                                    invoice: invoice,
                                    onPaymentSuccess: () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Payment processed successfully!'),
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    },
                                  ),
                                );
                              },
                            ),
                          ],
                        ],
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
            ],

            if (isProviderCompleted) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primaryUltraLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primaryLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.rate_review, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Text(
                          'Rate your experience',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Your job with $providerName is complete. Share your feedback to help others in the community.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      key: const Key('tracker_rate_specialist_button'),
                      icon: const Icon(Icons.star, size: 18),
                      label: const Text('Rate Specialist'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () {
                        WriteReviewBottomSheet.show(
                          context,
                          providerId: matchingBooking.providerId,
                          providerName: providerName,
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Back to Dashboard Button
            CustomButton(
              text: 'Return to Dashboard',
              isOutlined: true,
              onPressed: () => Navigator.pop(context),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildTierBadge(AgentWorkflowModel workflow) {
    if (workflow.isAutoApproved) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: AppColors.successLight, borderRadius: BorderRadius.circular(6)),
        child: const Text('Auto-Approved', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.success)),
      );
    } else if (workflow.isApprovedWithAudit) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: AppColors.primaryUltraLight, borderRadius: BorderRadius.circular(6)),
        child: const Text('Approved w/ Audit', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
      );
    } else {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(6), border: Border.all(color: Colors.amber.shade300)),
        child: Text('Needs Admin Review', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber.shade900)),
      );
    }
  }

  Widget _buildTimelineStep({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isDone,
    required bool isActive,
    Color? iconColorOverride,
  }) {
    Color iconColor;
    if (iconColorOverride != null) {
      iconColor = iconColorOverride;
    } else if (isDone) {
      iconColor = AppColors.success;
    } else if (isActive) {
      iconColor = AppColors.primary;
    } else {
      iconColor = AppColors.textMuted;
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 22, color: iconColor),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: isDone || isActive ? AppColors.textPrimary : AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineLine({required bool isDone}) {
    return Container(
      margin: const EdgeInsets.only(left: 10, top: 4, bottom: 4),
      alignment: Alignment.centerLeft,
      height: 24,
      width: 2,
      color: isDone ? AppColors.success : AppColors.border,
    );
  }
}
