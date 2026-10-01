import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/constants/colors.dart';
import '../../data/models/booking_model.dart';
import '../../data/models/invoice_model.dart';
import '../../data/models/predefined_slot_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/booking_provider.dart';
import '../../providers/payment_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/invoice_payment_sheet.dart';
import '../../widgets/predefined_slot_picker.dart';
import '../../widgets/status_badge.dart';
import '../customer/public_provider_profile_screen.dart';

class BookingDetailScreen extends StatefulWidget {
  final String bookingId;
  final BookingModel? initialBooking;

  const BookingDetailScreen({
    super.key,
    required this.bookingId,
    this.initialBooking,
  });

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().selectBooking(widget.bookingId);
    });
  }

  Future<void> _openRescheduleSheet(BookingModel booking) async {
    final bookingProvider = context.read<BookingProvider>();
    final rescheduled = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _RescheduleBottomSheet(
        booking: booking,
        bookingProvider: bookingProvider,
      ),
    );

    if (!mounted) return;
    if (rescheduled == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Booking rescheduled successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<BookingProvider>();
    final authProvider = context.watch<AuthProvider>();

    final booking = (bookingProvider.selectedBooking?.id == widget.bookingId
            ? bookingProvider.selectedBooking
            : null) ??
        bookingProvider.bookings.cast<BookingModel?>().firstWhere(
              (b) => b?.id == widget.bookingId,
              orElse: () => null,
            ) ??
        widget.initialBooking;

    if (booking == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Booking Details')),
        body: bookingProvider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.receipt_long_outlined, size: 56, color: AppColors.textMuted),
                    const SizedBox(height: 12),
                    const Text(
                      'Booking not found',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: () => bookingProvider.selectBooking(widget.bookingId),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
      );
    }

    final currencyFormat = NumberFormat('#,##0', 'en_US');
    final formattedCreatedDate = DateFormat('EEE, dd MMM yyyy, hh:mm a').format(booking.createdAt);
    final canReschedule = booking.isRequested || booking.isAccepted;
    final isViewerProvider = authProvider.isProvider;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Booking Details'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => bookingProvider.selectBooking(widget.bookingId),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              booking.category ?? 'Service Booking',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Ref #${booking.id.substring(0, booking.id.length > 8 ? 8 : booking.id.length).toUpperCase()}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textMuted,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      StatusBadge(status: booking.status),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    booking.description ?? 'Standard maintenance and repair service',
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.textMuted),
                      const SizedBox(width: 6),
                      Text(
                        'Created $formattedCreatedDate',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Time Slot & Reschedule Section (Dynamic Duration-Aware Predefined Slot System)
            _buildTimeSlotCard(context, booking, canReschedule),

            const SizedBox(height: 18),

            // Assigned Party Card (Real data, role-aware, clickable to Provider Profile)
            _buildAssignedPartyCard(context, booking, isViewerProvider),

            // Customer Notes & Instructions (if present)
            if (booking.notes != null && booking.notes!.trim().isNotEmpty) ...[
              const SizedBox(height: 18),
              _buildCustomerNotesCard(booking.notes!.trim()),
            ],

            // Service Location (if present)
            if (booking.serviceLocation != null && booking.serviceLocation!.trim().isNotEmpty) ...[
              const SizedBox(height: 18),
              _buildLocationCard(booking.serviceLocation!.trim()),
            ],

            const SizedBox(height: 18),

            // Pricing & Invoice Breakdown
            _buildPricingSection(context, booking, currencyFormat),

            const SizedBox(height: 24),

            // Dispute Action Trigger
            if (!booking.isDisputed && !booking.isCompleted) ...[
              CustomButton(
                text: 'Raise Issue or Dispute',
                isOutlined: true,
                textColor: AppColors.error,
                backgroundColor: AppColors.error,
                onPressed: () => _showDisputeDialog(context, bookingProvider, booking.id),
              ),
            ],

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeSlotCard(BuildContext context, BookingModel booking, bool canReschedule) {
    final scheduledAt = booking.scheduledAt;
    final hasSchedule = scheduledAt != null;
    final durationHours = booking.durationHours > 0 ? booking.durationHours : 1;
    final dateStr = hasSchedule ? DateFormat('EEEE, dd MMMM yyyy').format(scheduledAt) : null;
    final endTime = hasSchedule ? scheduledAt.add(Duration(hours: durationHours)) : null;
    final timeStr = hasSchedule
        ? '${DateFormat('hh:mm a').format(scheduledAt)} – ${DateFormat('hh:mm a').format(endTime!)}'
        : null;

    final durationBadge = durationHours == 1 ? '1-Hour Slot' : '$durationHours Hours ($durationHours Slots)';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
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
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primaryUltraLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.access_time_filled_rounded, size: 18, color: AppColors.primary),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Time Slot & Schedule',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryUltraLight,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  durationBadge,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (hasSchedule) ...[
            Row(
              children: [
                const Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.textMuted),
                const SizedBox(width: 8),
                Text(
                  dateStr!,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.schedule_rounded, size: 16, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  timeStr!,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              durationHours == 1
                  ? 'Confirmed 1-hour predefined time slot.'
                  : 'Confirmed reservation spans $durationHours consecutive 1-hour time slots.',
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
          ] else ...[
            const Row(
              children: [
                Icon(Icons.info_outline_rounded, size: 16, color: AppColors.warning),
                SizedBox(width: 8),
                Text(
                  'Not scheduled yet. Waiting for confirmation.',
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
          if (canReschedule) ...[
            const Divider(height: 24, color: AppColors.borderLight),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _openRescheduleSheet(booking),
                icon: const Icon(Icons.edit_calendar_outlined, size: 16),
                label: Text(
                  durationHours == 1 ? 'Reschedule Time Slot' : 'Reschedule ($durationHours-Hour Window)',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 11),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAssignedPartyCard(BuildContext context, BookingModel booking, bool isViewerProvider) {
    if (isViewerProvider) {
      // Viewer is Service Provider: Show Customer Information
      final customerDisplayName = booking.customerName?.isNotEmpty == true
          ? booking.customerName!
          : 'Customer';
      final customerPhone = booking.customerPhone?.isNotEmpty == true
          ? booking.customerPhone!
          : 'Phone provided on dispatch';

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Customer Information',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: const BoxDecoration(
                    color: AppColors.primaryUltraLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.person_rounded, color: AppColors.primary, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        customerDisplayName,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        customerPhone,
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    // Viewer is Customer: Show Provider Card (linked to PublicProviderProfileScreen)
    final providerName = booking.providerName ?? booking.provider?.fullName;
    final displayName = (providerName != null && providerName.trim().isNotEmpty)
        ? providerName.trim()
        : 'Assigned Service Specialist';

    final rating = booking.provider?.rating ?? 0.0;
    final reviews = booking.provider?.totalReviews ?? 0;
    final ratingSubtitle = rating > 0
        ? 'Verified Specialist · ★ ${rating.toStringAsFixed(1)}${reviews > 0 ? " ($reviews reviews)" : ""}'
        : 'Verified Service Specialist • On-Demand';

    final hasPhoto = booking.provider?.fullProfilePhotoUrl != null &&
        booking.provider!.fullProfilePhotoUrl!.isNotEmpty;

    // Use provider.id if populated, otherwise booking.providerId
    final targetProviderId = (booking.provider?.id != null && booking.provider!.id.isNotEmpty)
        ? booking.provider!.id
        : booking.providerId;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Assigned Service Provider',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            if (targetProviderId.isNotEmpty)
              const Text(
                'View Profile ›',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),
        Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: targetProviderId.isNotEmpty
                ? () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PublicProviderProfileScreen(
                          providerId: targetProviderId,
                          initialProfile: booking.provider,
                        ),
                      ),
                    );
                  }
                : null,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Row(
                children: [
                  hasPhoto
                      ? CircleAvatar(
                          radius: 24,
                          backgroundImage: NetworkImage(booking.provider!.fullProfilePhotoUrl!),
                        )
                      : Container(
                          padding: const EdgeInsets.all(12),
                          decoration: const BoxDecoration(
                            color: AppColors.primaryUltraLight,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.handyman_rounded, color: AppColors.primary, size: 24),
                        ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          ratingSubtitle,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Tap to view ratings & catalog',
                          style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 22),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCustomerNotesCard(String notes) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primaryUltraLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.sticky_note_2_outlined, size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: 10),
              const Text(
                'Customer Instructions & Notes',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Text(
              notes,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationCard(String location) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primaryUltraLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.location_on_outlined, size: 18, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Service Location',
                  style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  location,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPricingSection(BuildContext context, BookingModel booking, NumberFormat currencyFormat) {
    final paymentProvider = context.watch<PaymentProvider>();
    final invoice = paymentProvider.getInvoiceForBooking(booking.id) ??
        InvoiceModel(
          id: 'inv-${booking.id.substring(0, booking.id.length > 8 ? 8 : booking.id.length)}',
          bookingId: booking.id,
          customerId: booking.customerId,
          providerId: booking.providerId,
          providerName: booking.provider?.fullName ?? booking.providerName,
          baseAmount: ((booking.price ?? 4500) * 0.85).roundToDouble(),
          platformFee: ((booking.price ?? 4500) * 0.15).roundToDouble(),
          totalAmount: (booking.price ?? 4500).toDouble(),
          status: booking.isCompleted ? 'Paid' : 'Issued',
          createdAt: booking.createdAt,
        );

    final isPaid = invoice.isPaid;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Pricing & Quote Breakdown',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            StatusBadge(status: invoice.status),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              _buildPriceRow('Service Labor (85%)', 'Rs. ${currencyFormat.format(invoice.baseAmount)}'),
              const SizedBox(height: 10),
              _buildPriceRow('Platform Trust & Safety Fee (15%)', 'Rs. ${currencyFormat.format(invoice.platformFee)}'),
              const Divider(color: AppColors.borderLight, height: 24),
              _buildPriceRow(
                'Total Approved Amount',
                'Rs. ${currencyFormat.format(invoice.totalAmount)}',
                isTotal: true,
              ),
              const SizedBox(height: 16),
              if (isPaid) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                  decoration: BoxDecoration(
                    color: AppColors.successLight,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.success.withOpacity(0.3)),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle_rounded, color: AppColors.success, size: 16),
                      SizedBox(width: 8),
                      Text(
                        'Paid in Full • Payout Ledger Credited',
                        style: TextStyle(
                          color: AppColors.success,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                CustomButton(
                  text: 'Pay Invoice (Sandbox Card)',
                  icon: Icons.credit_card,
                  onPressed: () {
                    InvoicePaymentSheet.show(
                      context,
                      invoice: invoice,
                      onPaymentSuccess: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Payment processed successfully!'),
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
        ),
      ],
    );
  }

  void _showDisputeDialog(BuildContext context, BookingProvider provider, String bookingId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Dispute Booking'),
        content: const Text(
          'Are you sure you wish to raise a formal dispute? An Admin will review the chat logs and quote validation history.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              provider.updateStatus(bookingId, 'Disputed');
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Dispute recorded and flagged for Admin resolution.'),
                  backgroundColor: AppColors.error,
                ),
              );
            },
            child: const Text('Confirm Dispute'),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String title, String value, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: isTotal ? 14 : 13,
            fontWeight: isTotal ? FontWeight.w800 : FontWeight.w500,
            color: isTotal ? AppColors.textPrimary : AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 16 : 13,
            fontWeight: isTotal ? FontWeight.w800 : FontWeight.w600,
            color: isTotal ? AppColors.primary : AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}

/// Modern Rescheduling Bottom Sheet integrating PredefinedSlotPicker
class _RescheduleBottomSheet extends StatefulWidget {
  final BookingModel booking;
  final BookingProvider bookingProvider;

  const _RescheduleBottomSheet({
    required this.booking,
    required this.bookingProvider,
  });

  @override
  State<_RescheduleBottomSheet> createState() => _RescheduleBottomSheetState();
}

class _RescheduleBottomSheetState extends State<_RescheduleBottomSheet> {
  PredefinedSlotModel? _selectedSlot;
  bool _isSubmitting = false;
  String? _errorMessage;

  Future<void> _handleConfirm() async {
    if (_selectedSlot == null || _isSubmitting) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final ok = await widget.bookingProvider.updateSchedule(
        widget.booking.id,
        _selectedSlot!.startTime,
      );

      if (!mounted) return;

      if (ok) {
        Navigator.pop(context, true);
      } else {
        setState(() {
          _isSubmitting = false;
          _errorMessage = widget.bookingProvider.errorMessage ??
              'Provider is not available at the requested time slot.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _errorMessage = e
            .toString()
            .replaceAll('ApiException:', '')
            .replaceAll('Exception:', '')
            .replaceAll('[', '')
            .replaceAll(']', '')
            .trim();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentSchedule = widget.booking.scheduledAt;
    final durationHours = widget.booking.durationHours > 0 ? widget.booking.durationHours : 1;
    final currentEndTime = currentSchedule?.add(Duration(hours: durationHours));
    final currentStr = currentSchedule != null
        ? '${DateFormat('EEE, dd MMM').format(currentSchedule)} • ${DateFormat('hh:mm a').format(currentSchedule)} – ${DateFormat('hh:mm a').format(currentEndTime!)} ($durationHours ${durationHours == 1 ? 'hr' : 'hrs'})'
        : 'Unscheduled';

    final now = DateTime.now();
    final initialDate = currentSchedule != null &&
            currentSchedule.isAfter(now.subtract(const Duration(hours: 1)))
        ? currentSchedule
        : now;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Reschedule Appointment',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Current: $currentStr',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context, false),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.borderLight),

          // Slot Picker in scrollable content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PredefinedSlotPicker(
                    providerId: widget.booking.providerId,
                    durationHours: durationHours,
                    initialDate: initialDate,
                    selectedSlot: _selectedSlot,
                    onSlotSelected: (slot) {
                      setState(() {
                        _selectedSlot = slot;
                        _errorMessage = null;
                      });
                    },
                  ),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.errorLight,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.error.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Bottom Action Bar
          Container(
            padding: EdgeInsets.fromLTRB(
              20,
              12,
              20,
              16 + MediaQuery.of(context).viewInsets.bottom + MediaQuery.of(context).padding.bottom,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_selectedSlot != null) ...[
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.primaryUltraLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.event_available_rounded, size: 16, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'New Window: ${DateFormat('EEE, dd MMM').format(_selectedSlot!.startTime)} • ${DateFormat('hh:mm a').format(_selectedSlot!.startTime)} – ${DateFormat('hh:mm a').format(_selectedSlot!.endTime)} ($durationHours ${durationHours == 1 ? 'hr' : 'hrs'})',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primaryDark),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                CustomButton(
                  text: _isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule',
                  isLoading: _isSubmitting,
                  icon: Icons.check_circle_outline_rounded,
                  onPressed: _selectedSlot != null && !_isSubmitting ? _handleConfirm : null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
