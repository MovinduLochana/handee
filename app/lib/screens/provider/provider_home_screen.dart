import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/booking_provider.dart';
import '../../providers/dispatch_provider.dart';
import '../../widgets/role_switch_sheet.dart';
import '../../widgets/status_badge.dart';
import 'dispatch_queue_screen.dart';
import 'edit_provider_profile_screen.dart';
import 'provider_jobs_screen.dart';
import '../shared/profile_screen.dart';
import '../../providers/service_directory_provider.dart';

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
    final pendingOffers = dispatch.incomingOffers.length;

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.borderLight, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
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
            const BottomNavigationBarItem(
              icon: Icon(Icons.work_outline),
              activeIcon: Icon(Icons.work),
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

    final user = auth.currentUser;
    final isOnline = dispatch.isOnline;
    final offers = dispatch.incomingOffers;
    final activeBooking = bookingProvider.activeBookings.isNotEmpty ? bookingProvider.activeBookings.first : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              user?.fullName ?? 'Nimal Jayawardena',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
            const Text(
              'Master Plumber · Colombo Central',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ActionChip(
              avatar: const Icon(Icons.swap_horiz, size: 16, color: AppColors.primary),
              label: const Text('Role', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
              backgroundColor: AppColors.primaryUltraLight,
              side: const BorderSide(color: AppColors.primaryLight, width: 0.5),
              onPressed: () => RoleSwitchSheet.show(context),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          final dispatchProv = context.read<DispatchProvider>();
          final bookingsProv = context.read<BookingProvider>();
          await dispatchProv.fetchOffers();
          await bookingsProv.fetchProviderBookings();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
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
                        Column(
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
                            Text(
                              isOnline ? 'Receiving Instant Match dispatches' : 'Turn on to accept incoming requests',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ],
                    ),
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
                      gradient: const LinearGradient(
                        colors: [Color(0xFFB45309), Color(0xFFF59E0B)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.amber.withOpacity(0.3),
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

              // KPI Metrics
              Row(
                children: [
                  _buildMetricCard(
                    title: "Today's Payout",
                    value: 'Rs. 9,700',
                    icon: Icons.payments_outlined,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 12),
                  _buildMetricCard(
                    title: 'Completed',
                    value: '62 Jobs',
                    icon: Icons.task_alt,
                    color: AppColors.success,
                  ),
                  const SizedBox(width: 12),
                  _buildMetricCard(
                    title: 'Rating',
                    value: '4.9 ★',
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
                          Text(
                            activeBooking.jobRequest?.categoryName ?? 'Plumbing Repair',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                          StatusBadge(status: activeBooking.status),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        activeBooking.jobRequest?.description ?? 'Bathroom pipe repair at site',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.place, size: 16, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              activeBooking.serviceLocation ?? 'No. 42, Flower Road, Colombo 07',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const ProviderJobsScreen()),
                                );
                              },
                              icon: const Icon(Icons.navigation_outlined, size: 16),
                              label: const Text('Update Field Status'),
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

              // Trade Profile & Qualifications Card
              Container(
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
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.badge, size: 18, color: AppColors.primary),
                            SizedBox(width: 8),
                            Text(
                              'Trade Profile & Rates',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                        TextButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const EditProviderProfileScreen()),
                            );
                          },
                          icon: const Icon(Icons.edit, size: 14),
                          label: const Text('Edit Details', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Consumer<ServiceDirectoryProvider>(
                      builder: (context, dir, _) {
                        final p = dir.myProfile;
                        final skills = p?.skillCategories.isNotEmpty == true
                            ? p!.skillCategories.join(' · ')
                            : 'Plumbing · Electrical · AC Repair';
                        final rate = p?.hourlyRate != null
                            ? 'Rs. ${p!.hourlyRate!.toInt()} / hr'
                            : 'Rs. 2,500 / hr';
                        final exp = p != null && p.yearsOfExperience > 0
                            ? '${p.yearsOfExperience} yrs exp'
                            : '10 yrs exp';

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              p?.headline ?? 'Master Plumber & AC Repair Specialist',
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '$skills  ·  $exp  ·  $rate',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
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
