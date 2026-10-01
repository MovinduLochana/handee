import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/booking_card.dart';
import 'active_job_screen.dart';

class ProviderJobsScreen extends StatefulWidget {
  const ProviderJobsScreen({super.key});

  @override
  State<ProviderJobsScreen> createState() => _ProviderJobsScreenState();
}

class _ProviderJobsScreenState extends State<ProviderJobsScreen> with SingleTickerProviderStateMixin {
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
        title: const Text('My Field Assignments'),
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
        onRefresh: () => provider.fetchProviderBookings(),
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildList(provider.activeBookings, 'No active jobs in progress.'),
            _buildList(provider.completedBookings, 'No completed jobs yet.'),
            _buildList(provider.bookings, 'No jobs recorded.'),
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
