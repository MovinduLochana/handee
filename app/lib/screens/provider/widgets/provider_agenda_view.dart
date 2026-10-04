import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../data/models/booking_model.dart';
import '../../../widgets/status_badge.dart';
import '../active_job_screen.dart';

class ProviderAgendaView extends StatefulWidget {
  final List<BookingModel> bookings;
  final DateTime? initialDate;
  final void Function(BookingModel booking)? onBookingTap;

  const ProviderAgendaView({
    super.key,
    required this.bookings,
    this.initialDate,
    this.onBookingTap,
  });

  @override
  State<ProviderAgendaView> createState() => _ProviderAgendaViewState();
}

class _ProviderAgendaViewState extends State<ProviderAgendaView> {
  late DateTime _selectedDate;
  late List<DateTime> _dateStrip;

  @override
  void initState() {
    super.initState();
    final now = widget.initialDate ?? DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
    _dateStrip = List.generate(14, (i) {
      final d = now.add(Duration(days: i));
      return DateTime(d.year, d.month, d.day);
    });
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  List<BookingModel> _getBookingsForDate(DateTime date) {
    return widget.bookings.where((b) {
      if (b.scheduledAt == null) return false;
      final local = b.scheduledAt!.toLocal();
      return _isSameDay(local, date) && (b.isAccepted || b.isInProgress);
    }).toList();
  }

  BookingModel? _getBookingAtHour(List<BookingModel> dayBookings, int hour) {
    for (final b in dayBookings) {
      if (b.scheduledAt == null) continue;
      final start = b.scheduledAt!.toLocal();
      final duration = b.durationHours > 0 ? b.durationHours : 1;
      final endHour = start.hour + duration;

      if (start.hour <= hour && hour < endHour) {
        return b;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final dayBookings = _getBookingsForDate(_selectedDate);
    final dayFormat = DateFormat('EEEE, MMM d');

    return Column(
      children: [
        // 1. Date Selector Strip
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: SizedBox(
            height: 70,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: _dateStrip.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final date = _dateStrip[index];
                final isSelected = _isSameDay(date, _selectedDate);
                final hasBookings = _getBookingsForDate(date).isNotEmpty;
                final isToday = _isSameDay(date, DateTime.now());

                return GestureDetector(
                  onTap: () => setState(() => _selectedDate = date),
                  child: Container(
                    width: 58,
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : (isToday ? AppColors.primaryLight : AppColors.border),
                        width: isSelected || isToday ? 1.5 : 1,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          DateFormat('E').format(date).toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isSelected ? Colors.white70 : AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          DateFormat('d').format(date),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        if (hasBookings)
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.white : AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          )
                        else
                          const SizedBox(height: 6),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),

        const Divider(height: 1, color: AppColors.borderLight),

        // 2. Day Summary Banner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: AppColors.surfaceElevated,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                dayFormat.format(_selectedDate),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: dayBookings.isNotEmpty ? AppColors.primaryUltraLight : AppColors.successLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  dayBookings.isNotEmpty
                      ? '${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''}'
                      : 'Day fully open',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: dayBookings.isNotEmpty ? AppColors.primary : AppColors.success,
                  ),
                ),
              ),
            ],
          ),
        ),

        // 3. Chronological Hourly Timeline (8 AM to 8 PM)
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            itemCount: 13, // 8:00 AM to 8:00 PM (8 to 20)
            itemBuilder: (context, index) {
              final hour = 8 + index;
              final hourLabel = DateFormat('h a').format(DateTime(2026, 1, 1, hour));
              final booking = _getBookingAtHour(dayBookings, hour);

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Time marker
                    SizedBox(
                      width: 55,
                      child: Text(
                        hourLabel,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Content block
                    Expanded(
                      child: booking != null
                          ? _buildBookingTimelineBlock(context, booking, hour)
                          : _buildOpenSlotBlock(hour),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildBookingTimelineBlock(BuildContext context, BookingModel booking, int hour) {
    final start = booking.scheduledAt!.toLocal();
    final isFirstHour = start.hour == hour;

    if (!isFirstHour) {
      // Continuation block for multi-hour appointments
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.primaryUltraLight.withOpacity(0.6),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.primaryLight.withOpacity(0.4)),
        ),
        child: Text(
          '↳ Continuing: ${booking.category ?? 'Service'} (${booking.customerName ?? 'Customer'})',
          style: const TextStyle(
            fontSize: 12,
            fontStyle: FontStyle.italic,
            color: AppColors.primaryDark,
          ),
        ),
      );
    }

    final duration = booking.durationHours > 0 ? booking.durationHours : 1;
    final end = start.add(Duration(hours: duration));
    final timeRange = '${DateFormat('h:mm a').format(start)} – ${DateFormat('h:mm a').format(end)}';

    return GestureDetector(
      onTap: () {
        if (widget.onBookingTap != null) {
          widget.onBookingTap!(booking);
        } else {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => ActiveJobScreen(booking: booking)),
          );
        }
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: booking.isInProgress ? AppColors.primary : AppColors.border,
            width: booking.isInProgress ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    booking.category ?? 'Scheduled Service',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                StatusBadge(status: booking.status),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.access_time, size: 13, color: AppColors.primary),
                const SizedBox(width: 4),
                Text(
                  timeRange,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
                Text(
                  ' ($duration hr${duration > 1 ? 's' : ''})',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 13, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    booking.customerName ?? 'Customer',
                    style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            if (booking.serviceLocation != null && booking.serviceLocation!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 13, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      booking.serviceLocation!,
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOpenSlotBlock(int hour) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, size: 14, color: AppColors.textMuted),
          const SizedBox(width: 6),
          const Text(
            'Open Availability Slot',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
