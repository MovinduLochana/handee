import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/status_badge.dart';
import '../shared/booking_detail_screen.dart';

class CustomerBookingsScreen extends StatefulWidget {
  const CustomerBookingsScreen({super.key});

  @override
  State<CustomerBookingsScreen> createState() => _CustomerBookingsScreenState();
}

class _CustomerBookingsScreenState extends State<CustomerBookingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BookingProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Bookings'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          tabs: [
            Tab(text: 'Active (${provider.activeBookings.length})'),
            Tab(text: 'Completed (${provider.completedBookings.length})'),
            Tab(text: 'All (${provider.bookings.length})'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.fetchCustomerBookings(),
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildList(provider.activeBookings, 'No active bookings currently.'),
            _buildList(provider.completedBookings, 'No completed bookings yet.'),
            _buildList(provider.bookings, 'No bookings found.'),
          ],
        ),
      ),
    );
  }

  Widget _buildList(List<BookingModel> items, String emptyMessage) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox_outlined, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              emptyMessage,
              style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    final currencyFormat = NumberFormat('#,##0', 'en_US');

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      itemCount: items.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final booking = items[index];
        final formattedDate = DateFormat('dd MMM yyyy, hh:mm a').format(booking.createdAt);

        return InkWell(
          onTap: () {
            context.read<BookingProvider>().selectBooking(booking.id);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BookingDetailScreen(bookingId: booking.id),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderLight),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.02),
                  blurRadius: 6,
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
                    Text(
                      booking.category ?? booking.jobRequest?.categoryName ?? 'General Service',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    StatusBadge(status: booking.status),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  booking.description ?? booking.jobRequest?.description ?? 'Routine service booking',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: AppColors.borderLight),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.person_pin, size: 16, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text(
                          booking.providerName ?? booking.provider?.fullName ?? 'Assigned Tradesperson',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    if (booking.price != null)
                      Text(
                        'Rs. ${currencyFormat.format(booking.price)}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  formattedDate,
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
