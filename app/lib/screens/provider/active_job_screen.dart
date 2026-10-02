import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../core/utils/external_launcher_helper.dart';
import '../../data/models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/status_badge.dart';

class ActiveJobScreen extends StatefulWidget {
  final BookingModel booking;

  const ActiveJobScreen({super.key, required this.booking});

  @override
  State<ActiveJobScreen> createState() => _ActiveJobScreenState();
}

class _ActiveJobScreenState extends State<ActiveJobScreen> {
  late BookingModel _booking;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _isUpdating = true);
    final provider = context.read<BookingProvider>();
    final success = await provider.updateStatus(_booking.id, newStatus);

    if (success && mounted) {
      setState(() {
        _booking = _booking.copyWith(status: newStatus);
        _isUpdating = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Field status updated to "$newStatus"'),
          backgroundColor: AppColors.primary,
        ),
      );

      if (newStatus == 'Completed') {
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) Navigator.pop(context);
        });
      }
    } else {
      setState(() => _isUpdating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat('#,##0', 'en_US');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Field Assignment'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _booking.category?.isNotEmpty == true
                            ? _booking.category!
                            : (_booking.jobRequest?.categoryName ?? 'Field Service'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      StatusBadge(status: _booking.status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _booking.description?.isNotEmpty == true
                        ? _booking.description!
                        : (_booking.jobRequest?.description ?? 'Immediate repair required'),
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  const Divider(color: AppColors.borderLight, height: 1),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Agreed Quote / Payout:',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                      Text(
                        'Rs. ${currencyFormat.format(_booking.price ?? 4500)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Customer Details Card
            const Text(
              'Customer Information',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 10),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primaryUltraLight,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.person, color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _booking.customerName ?? 'Customer',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                            ),
                            Text(
                              _booking.customerPhone ?? 'No phone provided',
                              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        key: const Key('active_job_call_button'),
                        tooltip: 'Call Customer',
                        onPressed: () => ExternalLauncherHelper.launchPhoneCall(context, _booking.customerPhone),
                        icon: const Icon(Icons.phone, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: AppColors.borderLight, height: 1),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 18, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _booking.serviceLocation?.isNotEmpty == true
                              ? _booking.serviceLocation!
                              : 'Service location not specified',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                      ),
                      if (_booking.serviceLocation != null && _booking.serviceLocation!.isNotEmpty)
                        TextButton.icon(
                          key: const Key('active_job_navigate_button'),
                          style: TextButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            foregroundColor: AppColors.primary,
                          ),
                          onPressed: () => ExternalLauncherHelper.launchMapNavigation(context, _booking.serviceLocation),
                          icon: const Icon(Icons.navigation, size: 14),
                          label: const Text('Directions', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Field Actions Progression
            const Text(
              'Update Field Progress',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 12),

            if (_booking.isAccepted) ...[
              CustomButton(
                text: 'Mark as "En Route / Traveling"',
                icon: Icons.directions_car,
                isLoading: _isUpdating,
                onPressed: () => _updateStatus('InProgress'),
              ),
            ] else if (_booking.isInProgress) ...[
              CustomButton(
                text: 'Complete Job & Issue Invoice',
                icon: Icons.task_alt,
                backgroundColor: AppColors.success,
                isLoading: _isUpdating,
                onPressed: () => _updateStatus('Completed'),
              ),
            ] else if (_booking.isCompleted) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.success.withOpacity(0.3)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle, color: AppColors.success),
                    SizedBox(width: 8),
                    Text(
                      'Job Completed & Payout Logged',
                      style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
