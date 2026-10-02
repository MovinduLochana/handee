import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../core/utils/external_launcher_helper.dart';
import '../../core/utils/schedule_conflict_helper.dart';
import '../../data/models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/booking_card.dart';
import 'active_job_screen.dart';
import 'dispatch_queue_screen.dart';
import 'widgets/provider_agenda_view.dart';

enum ProviderJobSegment { scheduled, instant }

class ProviderJobsScreen extends StatefulWidget {
  final ProviderJobSegment initialSegment;

  const ProviderJobsScreen({
    super.key,
    this.initialSegment = ProviderJobSegment.scheduled,
  });

  @override
  State<ProviderJobsScreen> createState() => _ProviderJobsScreenState();
}

class _ProviderJobsScreenState extends State<ProviderJobsScreen> with TickerProviderStateMixin {
  late ProviderJobSegment _currentSegment;
  late TabController _scheduledTabController;
  late TabController _instantTabController;
  bool _showAgendaView = false;
  final Set<String> _processingBookingIds = {};

  @override
  void initState() {
    super.initState();
    _currentSegment = widget.initialSegment;
    _scheduledTabController = TabController(length: 3, vsync: this);
    _instantTabController = TabController(length: 2, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<BookingProvider>().fetchProviderBookings();
      }
    });
  }

  @override
  void dispose() {
    _scheduledTabController.dispose();
    _instantTabController.dispose();
    super.dispose();
  }

  String _formatExpiration(BookingModel booking) {
    if (booking.expiresAt == null) return 'Expires in 24h';
    final diff = booking.expiresAt!.difference(DateTime.now());
    if (diff.isNegative) return 'Expired';
    if (diff.inHours >= 1) {
      return 'Expires in ${diff.inHours}h ${diff.inMinutes % 60}m';
    }
    return 'Expires in ${diff.inMinutes}m';
  }

  Widget _buildConflictBadge(ConflictAnalysis conflict) {
    Color bgColor;
    Color borderColor;
    Color textColor;
    IconData icon;

    switch (conflict.severity) {
      case ConflictSeverity.conflict:
        bgColor = const Color(0xFFFFF1F2);
        borderColor = const Color(0xFFFECDD3);
        textColor = const Color(0xFF9F1239);
        icon = Icons.warning_amber_rounded;
        break;
      case ConflictSeverity.tight:
        bgColor = const Color(0xFFFFFBEB);
        borderColor = const Color(0xFFFDE68A);
        textColor = const Color(0xFF92400E);
        icon = Icons.timelapse;
        break;
      case ConflictSeverity.clear:
        bgColor = const Color(0xFFF0FDF4);
        borderColor = const Color(0xFFDCFCE7);
        textColor = const Color(0xFF166534);
        icon = Icons.check_circle_outline;
        break;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              conflict.message,
              style: TextStyle(
                fontSize: 12,
                fontWeight: conflict.hasConflict ? FontWeight.w600 : FontWeight.w500,
                color: textColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleDecline(BookingProvider provider, String bookingId) async {
    final reasonController = TextEditingController();
    final shouldDecline = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Decline Booking Request'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400, minWidth: 280),
          child: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Are you sure you want to decline this scheduled booking? The customer will be notified and your calendar slot will be released.',
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: reasonController,
                  decoration: const InputDecoration(
                    labelText: 'Reason (optional)',
                    hintText: 'e.g. Fully booked or personal leave',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              minimumSize: const Size(80, 38),
            ),
            onPressed: () => Navigator.pop(dialogCtx, true),
            child: const Text('Decline', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (shouldDecline == true) {
      setState(() => _processingBookingIds.add(bookingId));
      try {
        await provider.declineBooking(bookingId, reason: reasonController.text.trim());
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Booking request declined and slot released.'),
              backgroundColor: AppColors.textPrimary,
              action: SnackBarAction(
                label: 'VIEW IN HISTORY',
                textColor: Colors.white,
                onPressed: () {
                  _scheduledTabController.animateTo(2);
                },
              ),
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() => _processingBookingIds.remove(bookingId));
        }
      }
    }
  }

  Future<void> _handleAccept(BookingProvider provider, BookingModel booking) async {
    // 1. Expiration pre-flight check
    if (booking.expiresAt != null && booking.expiresAt!.isBefore(DateTime.now())) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This booking request has expired and can no longer be accepted.'),
          backgroundColor: AppColors.error,
        ),
      );
      provider.fetchProviderBookings();
      return;
    }

    // 2. Schedule Conflict check
    final conflict = ScheduleConflictHelper.analyze(
      targetBooking: booking,
      existingBookings: provider.bookings,
    );

    if (conflict.hasConflict) {
      final shouldAcceptAnyway = await showDialog<bool>(
        context: context,
        builder: (dialogCtx) => AlertDialog(
          icon: const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 36),
          title: const Text('Schedule Conflict Detected'),
          content: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400, minWidth: 280),
            child: SizedBox(
              width: double.maxFinite,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'You already have an appointment during this time:\n\n• ${conflict.message}',
                    style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Accepting this appointment will create a double-booking on your calendar. Do you want to accept anyway?',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                minimumSize: const Size(110, 38),
              ),
              onPressed: () => Navigator.pop(dialogCtx, true),
              child: const Text('Accept Anyway', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );

      if (shouldAcceptAnyway != true) return;
    }

    setState(() => _processingBookingIds.add(booking.id));

    try {
      final success = await provider.acceptBooking(booking.id);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Booking accepted for ${booking.customerName ?? "Customer"}!'),
              backgroundColor: AppColors.success,
              action: SnackBarAction(
                label: 'VIEW IN UPCOMING',
                textColor: Colors.white,
                onPressed: () {
                  _scheduledTabController.animateTo(1);
                },
              ),
            ),
          );
          _scheduledTabController.animateTo(1);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(provider.errorMessage ?? 'Failed to accept booking. Please try again.'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } finally {
      if (mounted) {
        setState(() => _processingBookingIds.remove(booking.id));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BookingProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Field Assignments'),
        actions: [
          if (_currentSegment == ProviderJobSegment.scheduled)
            IconButton(
              key: const Key('toggle_agenda_view_button'),
              tooltip: _showAgendaView ? 'Switch to Card List' : 'Switch to Agenda Timeline',
              icon: Icon(_showAgendaView ? Icons.view_agenda_outlined : Icons.calendar_month_outlined),
              onPressed: () {
                setState(() {
                  _showAgendaView = !_showAgendaView;
                });
              },
            ),
        ],
        bottom: _showAgendaView && _currentSegment == ProviderJobSegment.scheduled
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(96),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      child: SizedBox(
                        width: double.infinity,
                        child: SegmentedButton<ProviderJobSegment>(
                          key: const Key('provider_job_segment_selector'),
                          showSelectedIcon: false,
                          style: ButtonStyle(
                            visualDensity: VisualDensity.compact,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: WidgetStateProperty.all(
                              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                          segments: [
                            ButtonSegment<ProviderJobSegment>(
                              value: ProviderJobSegment.scheduled,
                              icon: const Icon(Icons.calendar_month, size: 16),
                              label: Text(
                                'Scheduled (${provider.pendingScheduledCount + provider.upcomingScheduledCount})',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                            ButtonSegment<ProviderJobSegment>(
                              value: ProviderJobSegment.instant,
                              icon: const Icon(Icons.bolt, size: 16),
                              label: Text(
                                'Instant (${provider.activeInstantCount})',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                          selected: {_currentSegment},
                          onSelectionChanged: (newSelection) {
                            setState(() {
                              _currentSegment = newSelection.first;
                              _showAgendaView = false;
                            });
                          },
                        ),
                      ),
                    ),
                    if (_currentSegment == ProviderJobSegment.scheduled)
                      TabBar(
                        key: const Key('scheduled_tab_bar'),
                        controller: _scheduledTabController,
                        labelColor: AppColors.primary,
                        unselectedLabelColor: AppColors.textSecondary,
                        indicatorColor: AppColors.primary,
                        indicatorWeight: 3,
                        tabs: [
                          Tab(text: 'Requests (${provider.pendingRequests.length})'),
                          Tab(text: 'Upcoming (${provider.upcomingScheduledBookings.length})'),
                          Tab(text: 'History (${provider.pastScheduledBookings.length})'),
                        ],
                      )
                    else
                      TabBar(
                        key: const Key('instant_tab_bar'),
                        controller: _instantTabController,
                        labelColor: AppColors.primary,
                        unselectedLabelColor: AppColors.textSecondary,
                        indicatorColor: AppColors.primary,
                        indicatorWeight: 3,
                        tabs: [
                          Tab(text: 'Active (${provider.activeInstantJobs.length})'),
                          Tab(text: 'History (${provider.pastInstantJobs.length})'),
                        ],
                      ),
                  ],
                ),
              ),
      ),
      body: _showAgendaView && _currentSegment == ProviderJobSegment.scheduled
          ? ProviderAgendaView(bookings: provider.upcomingScheduledBookings)
          : RefreshIndicator(
              onRefresh: () => provider.fetchProviderBookings(),
              child: _currentSegment == ProviderJobSegment.scheduled
                  ? TabBarView(
                      controller: _scheduledTabController,
                      children: [
                        _buildRequestsList(provider.pendingRequests, provider),
                        _buildList(provider.upcomingScheduledBookings, 'No upcoming scheduled appointments.'),
                        _buildList(provider.pastScheduledBookings, 'No past scheduled bookings recorded.'),
                      ],
                    )
                  : TabBarView(
                      controller: _instantTabController,
                      children: [
                        _buildInstantActiveList(provider.activeInstantJobs),
                        _buildList(provider.pastInstantJobs, 'No past instant jobs recorded.'),
                      ],
                    ),
            ),
    );
  }

  Widget _buildInstantActiveList(List<BookingModel> items) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
        _buildLiveRadarBanner(),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.bolt, size: 48, color: AppColors.textMuted),
                  SizedBox(height: 12),
                  Text(
                    'No active instant jobs in progress.',
                    style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          )
        else
          ...items.map(
            (booking) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: BookingCard(
                booking: booking,
                isProviderView: true,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => ActiveJobScreen(booking: booking)),
                  );
                },
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildLiveRadarBanner() {
    return Container(
      key: const Key('instant_dispatch_radar_banner'),
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.shade300),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.amber.shade100,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.radar_rounded, size: 20, color: Colors.amber),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Live Radar Online',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
                SizedBox(height: 2),
                Text(
                  'Incoming on-demand dispatches expire in 90 seconds.',
                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          TextButton(
            key: const Key('open_live_radar_button'),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const DispatchQueueScreen()),
              );
            },
            child: const Text('Open Radar', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestsList(List<BookingModel> items, BookingProvider provider) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.event_available, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            const Text(
              'No pending booking requests.',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 6),
            const Text(
              'When customers book slots from your listings, they will appear here with up to 24 hours to review.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    final currencyFormat = NumberFormat('#,##0', 'en_US');
    final dateFormat = DateFormat('EEE, MMM d • h:mm a');

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      itemCount: items.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final booking = items[index];
        final conflict = ScheduleConflictHelper.analyze(
          targetBooking: booking,
          existingBookings: provider.bookings,
        );

        return Card(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
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
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.2,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.timer_outlined, size: 12, color: Color(0xFF92400E)),
                          const SizedBox(width: 4),
                          Text(
                            _formatExpiration(booking),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF92400E),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.person_outline_rounded, size: 15, color: AppColors.textMuted),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        booking.customerName ?? 'Customer',
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                      ),
                    ),
                    if (booking.customerPhone != null && booking.customerPhone!.isNotEmpty)
                      InkWell(
                        key: Key('call_customer_${booking.id}'),
                        onTap: () => ExternalLauncherHelper.launchPhoneCall(context, booking.customerPhone),
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.phone_outlined, size: 12, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Text(
                                booking.customerPhone!,
                                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
                if (booking.scheduledAt != null) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 6),
                      Text(
                        dateFormat.format(booking.scheduledAt!.toLocal()),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _buildConflictBadge(conflict),
                ],
                if (booking.serviceLocation != null && booking.serviceLocation!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 15, color: AppColors.textMuted),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          booking.serviceLocation!,
                          style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      InkWell(
                        key: Key('navigate_customer_${booking.id}'),
                        onTap: () => ExternalLauncherHelper.launchMapNavigation(
                          context,
                          booking.serviceLocation,
                          latitude: booking.latitude,
                          longitude: booking.longitude,
                        ),
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.directions_outlined, size: 12, color: AppColors.textSecondary),
                              SizedBox(width: 3),
                              Text(
                                'Map',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                if (booking.notes != null && booking.notes!.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: const Border(left: BorderSide(color: Color(0xFFCBD5E1), width: 2.5)),
                    ),
                    child: Text(
                      booking.notes!,
                      style: const TextStyle(fontSize: 12.5, fontStyle: FontStyle.italic, color: AppColors.textSecondary, height: 1.3),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (booking.price != null)
                      Text(
                        'LKR ${currencyFormat.format(booking.price)}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                      )
                    else
                      const SizedBox.shrink(),
                    Row(
                      children: [
                        OutlinedButton(
                          key: Key('decline_booking_${booking.id}'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.textSecondary,
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            minimumSize: const Size(76, 36),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          ),
                          onPressed: _processingBookingIds.contains(booking.id)
                              ? null
                              : () => _handleDecline(provider, booking.id),
                          child: const Text('Decline', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          key: Key('accept_booking_${booking.id}'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: (booking.expiresAt != null && booking.expiresAt!.isBefore(DateTime.now()))
                                ? AppColors.textMuted
                                : AppColors.primary,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            minimumSize: const Size(80, 36),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          ),
                          onPressed: _processingBookingIds.contains(booking.id)
                              ? null
                              : () => _handleAccept(provider, booking),
                          child: _processingBookingIds.contains(booking.id)
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Accept', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildList(List<BookingModel> items, String emptyMessage) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.assignment_outlined, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              emptyMessage,
              style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      itemCount: items.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final booking = items[index];
        return BookingCard(
          booking: booking,
          isProviderView: true,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => ActiveJobScreen(booking: booking)),
            );
          },
        );
      },
    );
  }
}
