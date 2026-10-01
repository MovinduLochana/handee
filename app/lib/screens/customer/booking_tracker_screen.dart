import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/models/agent_workflow_model.dart';
import '../../data/models/invoice_model.dart';
import '../../providers/job_request_provider.dart';
import '../../providers/payment_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/invoice_payment_sheet.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/urgency_badge.dart';

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

      // Stop rapid polling once request is Open or Cancelled, or after 20 polls (~50s)
      if (request != null && (request.isOpen || request.isCancelled || _pollCount >= 20)) {
        timer.cancel();
      }

      await provider.refreshTrackedRequest();
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
    final request = provider.currentTrackedRequest ??
        (provider.requests.isNotEmpty ? provider.requests.first : null);
    final workflow = provider.currentWorkflow;

    if (request == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Live Status Tracker')),
        body: const Center(child: Text('No active job request to track')),
      );
    }

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
            onPressed: () => provider.refreshTrackedRequest(),
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
                            request.location.split(',').first,
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
                  _buildTimelineLine(isDone: isOpen),
                  _buildTimelineStep(
                    icon: isCancelled
                        ? Icons.cancel_outlined
                        : (isOpen
                            ? Icons.check_circle
                            : (isHumanApprovalRequired ? Icons.shield_outlined : Icons.radio_button_unchecked)),
                    title: isCancelled
                        ? '3. Request Cancelled'
                        : (isOpen
                            ? '3. Dispatched & Ready'
                            : (isHumanApprovalRequired ? '3. Queued for Admin Review' : '3. Open for Matching')),
                    subtitle: isCancelled
                        ? 'This request was cancelled'
                        : (isOpen
                            ? 'Approved and dispatched — provider ready for confirmation'
                            : (isHumanApprovalRequired
                                ? 'AI safety check flagged variance. Staff will verify shortly.'
                                : 'Awaiting the outcome of AI review')),
                    isDone: isOpen,
                    isActive: isHumanApprovalRequired && isPendingReview,
                    iconColorOverride: isHumanApprovalRequired && isPendingReview ? Colors.amber.shade700 : null,
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

            // Dispatched & Booking Information
            if (isOpen) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primaryLight.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.event_available_outlined, color: AppColors.primary, size: 22),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Your request is open and dispatched! A booking has been created for your provider.',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
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

                  final invoice = paymentProvider.getInvoiceForBooking(request.id) ??
                      InvoiceModel(
                        id: 'inv-${request.id.substring(0, min(8, request.id.length))}',
                        bookingId: request.id,
                        customerId: request.customerId,
                        customerName: 'Customer',
                        providerId: workflow?.selectedProviderId ?? 'prov-001',
                        providerName: workflow?.selectedProviderName ?? 'Sunil Perera',
                        baseAmount: (workflow?.estimatedPrice ?? 4500.0) * 0.85,
                        platformFee: (workflow?.estimatedPrice ?? 4500.0) * 0.15,
                        totalAmount: workflow?.estimatedPrice ?? 4500.00,
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
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Service Base Rate:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                            Text('Rs. ${currencyFmt.format(invoice.baseAmount)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Platform & Booking Fee:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                            Text('Rs. ${currencyFmt.format(invoice.platformFee)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const SizedBox(height: 10),
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
                                        content: Text('Payment processed successfully via sandbox!'),
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
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
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
