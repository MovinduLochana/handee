import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/constants/colors.dart';
import '../core/utils/external_launcher_helper.dart';
import '../data/models/booking_model.dart';
import 'status_badge.dart';

class BookingCard extends StatelessWidget {
  final BookingModel booking;
  final VoidCallback onTap;
  final bool isProviderView;

  const BookingCard({
    super.key,
    required this.booking,
    required this.onTap,
    this.isProviderView = false,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat('#,##0', 'en_US');
    final durationHours = booking.durationHours > 0 ? booking.durationHours : 1;
    final scheduledAt = booking.scheduledAt;
    final endTime = scheduledAt?.add(Duration(hours: durationHours));

    final partyName = isProviderView
        ? (booking.customerName?.isNotEmpty == true ? booking.customerName! : 'Verified Customer')
        : (booking.providerName?.isNotEmpty == true
            ? booking.providerName!
            : (booking.provider != null && booking.provider!.fullName.isNotEmpty
                ? booking.provider!.fullName
                : 'Assigned Tradesperson'));

    final partyInitial = partyName.isNotEmpty ? partyName[0].toUpperCase() : 'U';

    final categoryTitle = booking.category?.isNotEmpty == true
        ? booking.category!
        : (booking.jobRequest != null && booking.jobRequest!.categoryName.isNotEmpty
            ? booking.jobRequest!.categoryName
            : 'General Service');

    final description = booking.description?.isNotEmpty == true
        ? booking.description!
        : (booking.jobRequest != null && booking.jobRequest!.description.isNotEmpty
            ? booking.jobRequest!.description
            : 'Service booking');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Header: Workflow Badge + Category Title + Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: booking.isInstantMatch ? AppColors.warningLight : AppColors.primaryUltraLight,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: booking.isInstantMatch
                          ? AppColors.warning.withOpacity(0.4)
                          : AppColors.primaryLight.withOpacity(0.4),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        booking.isInstantMatch ? Icons.flash_on : Icons.calendar_today,
                        size: 11,
                        color: booking.isInstantMatch ? const Color(0xFFB45309) : AppColors.primary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        booking.isInstantMatch ? '⚡ INSTANT DISPATCH' : '📅 SCHEDULED',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.3,
                          color: booking.isInstantMatch ? const Color(0xFFB45309) : AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                StatusBadge(status: booking.status),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              categoryTitle,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 10),

            // 2. Contextual Timing Banner
            if (booking.isInstantMatch)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.flash_on_rounded, size: 14, color: Color(0xFFD97706)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Dispatched: ${DateFormat('EEE, dd MMM • h:mm a').format(booking.createdAt.toLocal())}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF92400E),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: const Text(
                        'On-Demand',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFB45309),
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: scheduledAt != null ? const Color(0xFFF8FAFC) : const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: scheduledAt != null ? const Color(0xFFE2E8F0) : const Color(0xFFFDE68A),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      scheduledAt != null ? Icons.calendar_today_rounded : Icons.schedule_rounded,
                      size: 14,
                      color: scheduledAt != null ? AppColors.primary : Colors.amber.shade800,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        scheduledAt != null
                            ? '${DateFormat('EEE, dd MMM').format(scheduledAt)} • ${DateFormat('hh:mm a').format(scheduledAt)} – ${DateFormat('hh:mm a').format(endTime!)}'
                            : 'Not scheduled yet',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: scheduledAt != null ? AppColors.textPrimary : Colors.amber.shade900,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (scheduledAt != null) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primaryUltraLight,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '$durationHours ${durationHours == 1 ? 'hr' : 'hrs'}',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: 10),

            // 3. Service Scope / Description
            Text(
              description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.3,
              ),
            ),

            // 4. Location & Customer Note Metas
            if (booking.serviceLocation?.isNotEmpty == true || booking.notes?.isNotEmpty == true) ...[
              const SizedBox(height: 8),
              if (booking.serviceLocation?.isNotEmpty == true)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 13, color: AppColors.textMuted),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          booking.serviceLocation!,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              if (booking.notes?.isNotEmpty == true)
                Row(
                  children: [
                    const Icon(Icons.chat_bubble_outline_rounded, size: 12, color: AppColors.textMuted),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        'Note: "${booking.notes!}"',
                        style: const TextStyle(
                          fontSize: 11,
                          fontStyle: FontStyle.italic,
                          color: AppColors.textMuted,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
            ],

            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            const SizedBox(height: 10),

            // 5. Footer: Assigned Party & Price
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: AppColors.primaryUltraLight,
                        child: Text(
                          partyInitial,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isProviderView ? 'Customer' : 'Provider',
                              style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.w500),
                            ),
                            Text(
                              partyName,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (isProviderView && (booking.customerPhone?.isNotEmpty == true || booking.serviceLocation?.isNotEmpty == true)) ...[
                  if (booking.customerPhone?.isNotEmpty == true)
                    IconButton(
                      key: Key('card_quick_call_${booking.id}'),
                      icon: const Icon(Icons.phone_outlined, size: 18, color: AppColors.primary),
                      tooltip: 'Call Customer',
                      visualDensity: VisualDensity.compact,
                      onPressed: () => ExternalLauncherHelper.launchPhoneCall(context, booking.customerPhone),
                    ),
                  if (booking.serviceLocation?.isNotEmpty == true)
                    IconButton(
                      key: Key('card_quick_map_${booking.id}'),
                      icon: const Icon(Icons.directions_outlined, size: 18, color: AppColors.primary),
                      tooltip: 'Directions',
                      visualDensity: VisualDensity.compact,
                      onPressed: () => ExternalLauncherHelper.launchMapNavigation(context, booking.serviceLocation),
                    ),
                ],
                if (booking.price != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    'Rs. ${currencyFormat.format(booking.price)}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ],
                const SizedBox(width: 4),
                const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textMuted),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
