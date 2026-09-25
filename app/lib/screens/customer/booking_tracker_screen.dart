import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/models/invoice_model.dart';
import '../../providers/job_request_provider.dart';
import '../../providers/payment_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/invoice_payment_sheet.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/urgency_badge.dart';

class BookingTrackerScreen extends StatelessWidget {
  const BookingTrackerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<JobRequestProvider>();
    final request = provider.currentTrackedRequest ??
        (provider.requests.isNotEmpty ? provider.requests.first : null);

    if (request == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Live Status Tracker')),
        body: const Center(child: Text('No active job request to track')),
      );
    }

    // JobRequestStatus has exactly three values: PendingAiReview, Open,
    // Cancelled. There is no "dispatched" state on a JobRequest — once the
    // agent workflow approves it, the request becomes Open and a separate
    // Booking is created, which is tracked on the Bookings screen.
    final isPendingReview = request.isPendingAiReview;
    final isOpen = request.isOpen;
    final isCancelled = request.isCancelled;

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
            const Text(
              'Workflow Progress',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
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
                    subtitle: 'Request persisted to PostgreSQL with pending status',
                    isDone: true,
                    isActive: false,
                  ),
                  _buildTimelineLine(isDone: true),
                  _buildTimelineStep(
                    icon: isPendingReview ? Icons.hourglass_top : Icons.check_circle,
                    title: '2. Multi-Agent AI Analysis',
                    subtitle: 'Domain Analysis & Action agents validate scope and price bands',
                    isDone: !isPendingReview,
                    isActive: isPendingReview,
                  ),
                  _buildTimelineLine(isDone: isOpen),
                  _buildTimelineStep(
                    icon: isCancelled
                        ? Icons.cancel_outlined
                        : (isOpen ? Icons.check_circle : Icons.radio_button_unchecked),
                    title: isCancelled ? '3. Request Cancelled' : '3. Open for Matching',
                    subtitle: isCancelled
                        ? 'This request was cancelled and will not be matched'
                        : (isOpen
                            ? 'Approved and open — a booking is created once a provider is assigned'
                            : 'Awaiting the outcome of AI review'),
                    isDone: isOpen,
                    isActive: isCancelled,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // A JobRequest carries no provider/ETA/contact data — that lives on
            // the Booking created once a provider is assigned. Point the user
            // there instead of inventing details here.
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
                        'Your request is open. Once a provider is assigned, it appears '
                        'under your Bookings with their details and schedule.',
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
                        providerId: 'prov-001',
                        providerName: 'Nimal Jayawardena',
                        baseAmount: 3825.00,
                        platformFee: 675.00,
                        totalAmount: 4500.00,
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
                            StatusBadge(status: invoice.status),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // 85% / 15% breakdown
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Service Labor (85%)',
                                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                  ),
                                  Text(
                                    'Rs. ${currencyFmt.format(invoice.baseAmount)}',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Platform Fee (15%)',
                                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                  ),
                                  Text(
                                    'Rs. ${currencyFmt.format(invoice.platformFee)}',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                              const Divider(color: AppColors.borderLight, height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Total Amount',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                                  ),
                                  Text(
                                    'Rs. ${currencyFmt.format(invoice.totalAmount)}',
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w900,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 14),

                        if (isPaid) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.successLight,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.success.withOpacity(0.3)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.verified, color: AppColors.success, size: 18),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Invoice Paid in Full • Ledger Credited',
                                    style: TextStyle(
                                      color: AppColors.success,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ] else ...[
                          CustomButton(
                            text: 'Review & Pay Invoice (Sandbox)',
                            icon: Icons.credit_card,
                            onPressed: () {
                              InvoicePaymentSheet.show(
                                context,
                                invoice: invoice,
                                onPaymentSuccess: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Payment processed successfully via sandbox!'),
                                      backgroundColor: AppColors.success,
                                    ),
                                  );
                                },
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

            // Back to Home Button
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

  Widget _buildTimelineStep({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isDone,
    required bool isActive,
  }) {
    Color iconColor;
    if (isDone) {
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
