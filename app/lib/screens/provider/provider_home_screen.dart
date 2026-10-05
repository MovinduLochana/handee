import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../core/utils/external_launcher_helper.dart';
import '../../data/models/provider_profile_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/booking_provider.dart';
import '../../providers/dispatch_provider.dart';
import '../../providers/payment_provider.dart';
import '../../providers/service_directory_provider.dart';
import '../../widgets/provider_listing_card.dart';
import '../../widgets/status_badge.dart';
import '../customer/public_provider_profile_screen.dart';
import '../shared/profile_screen.dart';
import 'active_job_screen.dart';
import 'dispatch_queue_screen.dart';
import 'provider_jobs_screen.dart';
import 'provider_verification_screen.dart';

class ProviderHomeScreen extends StatefulWidget {
  const ProviderHomeScreen({super.key});

  @override
  State<ProviderHomeScreen> createState() => _ProviderHomeScreenState();
}

class _ProviderHomeScreenState extends State<ProviderHomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DispatchProvider>().fetchOffers();
      context.read<BookingProvider>().fetchProviderBookings();
      context.read<ServiceDirectoryProvider>().loadMyProviderProfile();
      final paymentProv = Provider.of<PaymentProvider?>(context, listen: false);
      paymentProv?.fetchProviderEarningsSummary();
    });
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      const _ProviderDashboardTab(),
      const DispatchQueueScreen(),
      const ProviderJobsScreen(),
      const ProfileScreen(),
    ];

    final dispatch = context.watch<DispatchProvider>();
    final bookingProvider = context.watch<BookingProvider>();
    final pendingOffers = dispatch.incomingOffers.length;
    final pendingRequests = bookingProvider.pendingRequests.length;

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.borderLight, width: 1)),
        ),
        child: SafeArea(
          top: false,
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            type: BottomNavigationBarType.fixed,
            backgroundColor: AppColors.surface,
            selectedItemColor: AppColors.primary,
            unselectedItemColor: AppColors.textMuted,
            selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
            elevation: 0,
            items: [
              const BottomNavigationBarItem(
                icon: Icon(Icons.dashboard_outlined),
                activeIcon: Icon(Icons.dashboard),
                label: 'Dashboard',
              ),
              BottomNavigationBarItem(
                icon: Badge(
                  isLabelVisible: pendingOffers > 0,
                  label: Text(pendingOffers.toString()),
                  child: const Icon(Icons.flash_on_outlined),
                ),
                activeIcon: Badge(
                  isLabelVisible: pendingOffers > 0,
                  label: Text(pendingOffers.toString()),
                  child: const Icon(Icons.flash_on),
                ),
                label: 'Dispatch',
              ),
              BottomNavigationBarItem(
                icon: Badge(
                  isLabelVisible: pendingRequests > 0,
                  label: Text(pendingRequests.toString()),
                  child: const Icon(Icons.work_outline),
                ),
                activeIcon: Badge(
                  isLabelVisible: pendingRequests > 0,
                  label: Text(pendingRequests.toString()),
                  child: const Icon(Icons.work),
                ),
                label: 'My Jobs',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.person_outline),
                activeIcon: Icon(Icons.person),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProviderDashboardTab extends StatelessWidget {
  const _ProviderDashboardTab();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final dispatch = context.watch<DispatchProvider>();
    final bookingProvider = context.watch<BookingProvider>();
    final dir = context.watch<ServiceDirectoryProvider>();
    final payment = Provider.of<PaymentProvider?>(context);
    final currencyFormat = NumberFormat('#,##0', 'en_US');

    final user = auth.currentUser;
    final isOnline = dispatch.isOnline;
    final offers = dispatch.incomingOffers;
    final activeBooking = bookingProvider.activeBookings.isNotEmpty ? bookingProvider.activeBookings.first : null;
    final myProfile = dir.myProfile;
    final verificationStatus = myProfile?.verificationStatus ?? 'Pending';
    final isVerified = verificationStatus.toLowerCase() == 'verified';

    // ─── Real KPI Financials & Performance Metrics ───
    final summary = payment?.providerEarningsSummary;
    final completedBookings = bookingProvider.completedBookings;
    final completedGross = completedBookings.fold<double>(
      0.0,
      (sum, b) => sum + (b.price ?? 0.0),
    );
    final netBookingsShare = completedGross * 0.85; // 85% provider share
    final totalEarnings = summary != null && summary.totalEarnings > 0
        ? summary.totalEarnings
        : (summary != null && summary.availableBalance > 0
            ? summary.availableBalance
            : netBookingsShare);

    final completedCount = (summary != null && summary.completedJobsCount > 0)
        ? summary.completedJobsCount
        : completedBookings.length;

    final ratingVal = myProfile?.rating ?? 0.0;
    final reviewCount = myProfile?.totalReviews ?? 0;
    final ratingDisplay = reviewCount > 0
        ? '${ratingVal.toStringAsFixed(1)} ★'
        : (ratingVal > 0 ? '${ratingVal.toStringAsFixed(1)} ★' : 'New ★');
    final ratingTitle = reviewCount > 0 ? 'Rating ($reviewCount)' : 'Rating';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              user?.fullName ?? myProfile?.fullName ?? 'Service Provider',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
            Text(
              myProfile?.headline?.isNotEmpty == true
                  ? myProfile!.headline!
                  : (myProfile?.skillCategories.isNotEmpty == true
                      ? '${myProfile!.skillCategories.first} Specialist'
                      : 'Professional Tradesperson'),
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          final dispatchProv = context.read<DispatchProvider>();
          final bookingsProv = context.read<BookingProvider>();
          final dirProv = context.read<ServiceDirectoryProvider>();
          final paymentProv = Provider.of<PaymentProvider?>(context, listen: false);
          await Future.wait([
            dispatchProv.fetchOffers().catchError((e) {
              debugPrint('Error refreshing dispatch offers: $e');
            }),
            bookingsProv.fetchProviderBookings().catchError((e) {
              debugPrint('Error refreshing provider bookings: $e');
            }),
            dirProv.loadMyProviderProfile().catchError((e) {
              debugPrint('Error refreshing provider profile: $e');
            }),
            if (paymentProv != null)
              paymentProv.fetchProviderEarningsSummary().catchError((e) {
                debugPrint('Error refreshing earnings summary: $e');
              }),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Pending Onboarding / Verification Guidance Banner
              if (!isVerified) ...[
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProviderVerificationScreen()),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: verificationStatus.toLowerCase() == 'rejected'
                          ? AppColors.errorLight
                          : AppColors.primaryUltraLight,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: verificationStatus.toLowerCase() == 'rejected'
                            ? AppColors.error
                            : AppColors.primaryLight,
                        width: 1.5,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          verificationStatus.toLowerCase() == 'rejected'
                              ? Icons.error_outline
                              : Icons.verified_user_outlined,
                          color: verificationStatus.toLowerCase() == 'rejected'
                              ? AppColors.error
                              : AppColors.primary,
                          size: 24,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                verificationStatus.toLowerCase() == 'rejected'
                                    ? 'Verification Action Required'
                                    : 'Verification Status: $verificationStatus',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: verificationStatus.toLowerCase() == 'rejected'
                                      ? AppColors.error
                                      : AppColors.primaryDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                verificationStatus.toLowerCase() == 'rejected'
                                    ? 'Your submission needs updated documents. Tap to re-upload.'
                                    : 'Admin review pending. Tap to manage or upload your NIC & trade credentials.',
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.primary),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Online / Offline Status Toggle Card
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  color: isOnline ? AppColors.successLight : AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isOnline ? AppColors.success.withOpacity(0.3) : AppColors.border,
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: isOnline ? AppColors.success : AppColors.textMuted,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isOnline ? 'You are Online' : 'You are Offline',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: isOnline ? AppColors.success : AppColors.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  isOnline
                                      ? 'Instant Match Radar Active (90s dispatches)'
                                      : 'Instant Radar Paused (Listing slots still bookable)',
                                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Switch(
                      value: isOnline,
                      activeThumbColor: AppColors.success,
                      onChanged: (val) => dispatch.toggleOnline(val),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Incoming Dispatch Banner (if any)
              if (offers.isNotEmpty && isOnline) ...[
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const DispatchQueueScreen()),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppColors.warning, AppColors.warning.withOpacity(0.85)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.warning.withOpacity(0.25),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.25),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.flash_on, color: Colors.white, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${offers.length} New Dispatch Offer Available!',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Tap to review details & accept before timer expires.',
                                style: TextStyle(color: Colors.white, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Incoming Scheduled Booking Requests Banner (if any)
              if (bookingProvider.pendingRequests.isNotEmpty) ...[
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProviderJobsScreen()),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.primaryDark, AppColors.primary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryDark.withOpacity(0.25),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.event_available, color: Colors.white, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${bookingProvider.pendingRequests.length} Scheduled Booking Request${bookingProvider.pendingRequests.length > 1 ? 's' : ''} Pending',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Tap to review customer notes and lock in your schedule.',
                                style: TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // KPI Metrics
              Row(
                children: [
                  _buildMetricCard(
                    title: 'Net Earnings',
                    value: 'Rs. ${currencyFormat.format(totalEarnings)}',
                    icon: Icons.payments_outlined,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 12),
                  _buildMetricCard(
                    title: 'Completed',
                    value: '$completedCount ${completedCount == 1 ? 'Job' : 'Jobs'}',
                    icon: Icons.task_alt,
                    color: AppColors.success,
                  ),
                  const SizedBox(width: 12),
                  _buildMetricCard(
                    title: ratingTitle,
                    value: ratingDisplay,
                    icon: Icons.star_outline,
                    color: AppColors.warning,
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Active Job Section
              const Text(
                'Active Field Assignment',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 10),

              if (activeBooking != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.primaryLight.withOpacity(0.6), width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: activeBooking.isInstantMatch
                                        ? AppColors.warningLight
                                        : AppColors.primaryUltraLight,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    activeBooking.isInstantMatch ? 'INSTANT' : 'SCHEDULED',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: activeBooking.isInstantMatch
                                          ? AppColors.warning
                                          : AppColors.primary,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    activeBooking.category?.isNotEmpty == true
                                        ? activeBooking.category!
                                        : (activeBooking.jobRequest?.categoryName ?? 'Field Service'),
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          StatusBadge(status: activeBooking.status),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        activeBooking.description?.isNotEmpty == true
                            ? activeBooking.description!
                            : (activeBooking.jobRequest?.description ?? 'Service in progress'),
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.person_outline, size: 15, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Text(
                                activeBooking.customerName ?? 'Customer',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                              ),
                            ],
                          ),
                          if (activeBooking.price != null)
                            Text(
                              'Rs. ${currencyFormat.format(activeBooking.price)}',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.place_outlined, size: 15, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              activeBooking.serviceLocation?.isNotEmpty == true
                                  ? activeBooking.serviceLocation!
                                  : 'Service location not specified',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          if (activeBooking.customerPhone?.isNotEmpty == true) ...[
                            IconButton(
                              key: const Key('dashboard_quick_call_button'),
                              tooltip: 'Call Customer',
                              icon: const Icon(Icons.phone_outlined, size: 18, color: AppColors.primary),
                              style: IconButton.styleFrom(
                                backgroundColor: AppColors.primaryUltraLight,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: () => ExternalLauncherHelper.launchPhoneCall(context, activeBooking.customerPhone),
                            ),
                            const SizedBox(width: 8),
                          ],
                          Expanded(
                            child: OutlinedButton.icon(
                              key: const Key('dashboard_navigate_button'),
                              onPressed: () => ExternalLauncherHelper.launchMapNavigation(
                                context,
                                activeBooking.serviceLocation,
                                latitude: activeBooking.latitude,
                                longitude: activeBooking.longitude,
                              ),
                              icon: const Icon(Icons.navigation_outlined, size: 16),
                              label: const Text('Directions'),
                              style: OutlinedButton.styleFrom(
                                minimumSize: const Size.fromHeight(42),
                                textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton.icon(
                              key: const Key('dashboard_update_status_button'),
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => ActiveJobScreen(booking: activeBooking)),
                                );
                              },
                              icon: const Icon(Icons.edit_note, size: 16),
                              label: const Text('Update Status'),
                              style: ElevatedButton.styleFrom(
                                minimumSize: const Size.fromHeight(42),
                                textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: const Center(
                    child: Text(
                      'No job in progress right now. Keep status online to receive dispatch alerts.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ),
                ),

              const SizedBox(height: 20),

              // Trade Profile & Rates Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Trade Profile & Rates',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                  ),
                  TextButton.icon(
                    key: const Key('dashboard_view_profile_header_button'),
                    onPressed: () {
                      final p = context.read<ServiceDirectoryProvider>().myProfile;
                      final providerToView = p ?? ProviderProfileModel(
                        id: auth.currentUser?.id ?? 'prov-me',
                        userId: auth.currentUser?.id ?? 'prov-me',
                        fullName: auth.currentUser?.fullName ?? 'Service Provider',
                        skillCategories: const [],
                        serviceArea: auth.currentUser?.address ?? 'Colombo',
                        rating: 0.0,
                        totalReviews: 0,
                        completedJobs: 0,
                        isVerified: isVerified,
                        headline: null,
                        yearsOfExperience: 0,
                      );
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => PublicProviderProfileScreen(
                            providerId: providerToView.id,
                            initialProfile: providerToView,
                            isOwnProfile: true,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.visibility_outlined, size: 14),
                    label: const Text('View Profile', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              Consumer<ServiceDirectoryProvider>(
                builder: (context, dir, _) {
                  final p = dir.myProfile;
                  final providerToDisplay = p ?? ProviderProfileModel(
                    id: auth.currentUser?.id ?? 'prov-me',
                    userId: auth.currentUser?.id ?? 'prov-me',
                    fullName: auth.currentUser?.fullName ?? 'Service Provider',
                    skillCategories: const [],
                    serviceArea: auth.currentUser?.address ?? 'Colombo',
                    rating: 0.0,
                    totalReviews: 0,
                    completedJobs: 0,
                    isVerified: isVerified,
                    headline: null,
                    yearsOfExperience: 0,
                  );

                  return ProviderListingCard(
                    provider: providerToDisplay,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => PublicProviderProfileScreen(
                            providerId: providerToDisplay.id,
                            initialProfile: providerToDisplay,
                            isOwnProfile: true,
                          ),
                        ),
                      );
                    },
                  );
                },
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
