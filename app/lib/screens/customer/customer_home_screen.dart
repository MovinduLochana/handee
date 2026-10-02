import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/booking_provider.dart';
import '../../providers/job_request_provider.dart';
import '../../widgets/status_badge.dart';
import 'assistant_chat_screen.dart';
import 'booking_tracker_screen.dart';
import 'create_job_screen.dart';
import 'customer_bookings_screen.dart';
import 'service_search_screen.dart';
import 'public_provider_profile_screen.dart';
import 'service_listing_details_screen.dart';
import '../shared/profile_screen.dart';
import '../shared/booking_detail_screen.dart';
import '../../providers/service_category_provider.dart';
import '../../providers/service_directory_provider.dart';
import '../../widgets/provider_listing_card.dart';
import '../../widgets/service_listing_card.dart';

class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({super.key});

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<JobRequestProvider>().fetchMyRequests();
      context.read<BookingProvider>().fetchCustomerBookings();
      // Preheat the search directory cache for the homepage widgets
      context.read<ServiceDirectoryProvider>().loadHomepageData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      const _CustomerHomeTab(),
      const CustomerBookingsScreen(),
      const AssistantChatScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.borderLight, width: 1)),
        ),
        child: SafeArea(
          top: false,
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
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home_filled),
                label: 'Home',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.calendar_month_outlined),
                activeIcon: Icon(Icons.calendar_month),
                label: 'Bookings',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.chat_bubble_outline),
                activeIcon: Icon(Icons.chat_bubble),
                label: 'AI Assistant',
              ),
              BottomNavigationBarItem(
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

class _CustomerHomeTab extends StatelessWidget {
  const _CustomerHomeTab();

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final jobReqProvider = context.watch<JobRequestProvider>();
    final bookingProvider = context.watch<BookingProvider>();

    final user = auth.currentUser;
    final activeRequest = jobReqProvider.requests.isNotEmpty ? jobReqProvider.requests.first : null;
    final activeBooking = bookingProvider.activeBookings.isNotEmpty ? bookingProvider.activeBookings.first : null;
    final pendingBooking = bookingProvider.pendingBookings.isNotEmpty ? bookingProvider.pendingBookings.first : null;
    final declinedBooking = bookingProvider.declinedBookings.isNotEmpty ? bookingProvider.declinedBookings.first : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 110,
        titleSpacing: 24,
        elevation: 0,
        backgroundColor: AppColors.background,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            Text(
              '${_getGreeting()},',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 2),
            Text(
              (user?.fullName ?? 'Customer').split(' ').first,
              style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, height: 1.1, letterSpacing: -1.0, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primaryUltraLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_on, size: 14, color: AppColors.primary),
                  const SizedBox(width: 4),
                  Text(
                    user?.address ?? 'Colombo, Sri Lanka',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          final jobReq = context.read<JobRequestProvider>();
          final bookings = context.read<BookingProvider>();
          final directory = context.read<ServiceDirectoryProvider>();
          await jobReq.fetchMyRequests();
          await bookings.fetchCustomerBookings();
          await directory.loadHomepageData();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Instant Match Hero Card (Bolder Design)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF2563EB)], // Slate 900 to Royal Blue
                    begin: Alignment.bottomRight,
                    end: Alignment.topLeft,
                  ),
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.4),
                      blurRadius: 32,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(50),
                        border: Border.all(color: Colors.white.withOpacity(0.3), width: 1.5),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10),
                        ]
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.bolt, color: Colors.amberAccent, size: 16),
                          SizedBox(width: 8),
                          Text(
                            'AI AGENT MATCH',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Text(
                      'Match with a\nVerified Pro.',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 42,
                        height: 1.05,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1.2,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Don\'t waste time searching. Tell our autonomous AI exactly what you need, and we\'ll dispatch the right tradesperson immediately.',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.85),
                        fontSize: 15,
                        height: 1.5,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 36),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const CreateJobScreen()),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF0F172A),
                        elevation: 12,
                        shadowColor: Colors.black.withOpacity(0.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Request Instant Match', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          Icon(Icons.arrow_forward_rounded, size: 24),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 48),

              // Active Tracking Widget (if any)
              if (activeRequest != null && activeRequest.isPendingAiReview) ...[
                const Text(
                  'In-Flight Request',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () {
                    jobReqProvider.setCurrentTrackedRequest(activeRequest);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const BookingTrackerScreen()),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.primaryLight.withOpacity(0.5), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.06),
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
                              activeRequest.categoryName,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                            ),
                            StatusBadge(status: activeRequest.status),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          activeRequest.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.arrow_forward, size: 14, color: AppColors.primary),
                            const SizedBox(width: 4),
                            const Text(
                              'Tap to track live AI workflow & provider status',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ] else if (activeBooking != null) ...[
                const Text(
                  'Active Booking',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () {
                    context.read<BookingProvider>().selectBooking(activeBooking.id);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => BookingDetailScreen(bookingId: activeBooking.id),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: const BoxDecoration(
                            color: AppColors.primaryUltraLight,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.handyman, color: AppColors.primary, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                activeBooking.providerName ?? activeBooking.provider?.fullName ?? 'Assigned Tradesperson',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                activeBooking.category ?? activeBooking.jobRequest?.categoryName ?? 'Service in Progress',
                                style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        StatusBadge(status: activeBooking.status),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 48),
              ] else if (pendingBooking != null) ...[
                const Text(
                  'Pending Booking Request',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () {
                    context.read<BookingProvider>().selectBooking(pendingBooking.id);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => BookingDetailScreen(bookingId: pendingBooking.id),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: const BoxDecoration(
                            color: Color(0xFFFFFBEB),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.schedule, color: Color(0xFFD97706), size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                pendingBooking.providerName ?? pendingBooking.provider?.fullName ?? 'Service Provider',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                pendingBooking.category ?? 'Scheduled Service (Awaiting Confirmation)',
                                style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        StatusBadge(status: pendingBooking.status),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 48),
              ] else if (declinedBooking != null) ...[
                const Text(
                  'Declined Booking Request',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.error),
                ),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () {
                    context.read<BookingProvider>().selectBooking(declinedBooking.id);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => BookingDetailScreen(bookingId: declinedBooking.id),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFECDD3)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: const BoxDecoration(
                            color: Color(0xFFFEE2E2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.cancel_outlined, color: AppColors.error, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                declinedBooking.providerName ?? declinedBooking.provider?.fullName ?? 'Service Provider',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                declinedBooking.notes != null && declinedBooking.notes!.toLowerCase().contains('declined reason:')
                                    ? declinedBooking.notes!
                                    : 'Provider declined this booking request. Tap to view or re-book.',
                                style: const TextStyle(fontSize: 12, color: Color(0xFF9F1239)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        StatusBadge(status: declinedBooking.status),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 48),
              ],

              // Service Categories Section
              Consumer<ServiceCategoryProvider>(
                builder: (context, catProvider, child) {
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'What do you need help with?',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: AppColors.textPrimary),
                      ),
                      if (catProvider.isLoading && catProvider.categories.isEmpty)
                        const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      else
                        Text(
                          '${catProvider.categories.length} categories',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                    ],
                  );
                }
              ),
              const SizedBox(height: 14),

              Consumer<ServiceCategoryProvider>(
                builder: (context, catProvider, child) {
                  if (catProvider.isLoading && catProvider.categories.isEmpty) {
                     return const Center(child: Padding(
                       padding: EdgeInsets.all(16.0),
                       child: CircularProgressIndicator(),
                     ));
                  }

                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: catProvider.categories.length,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 3.5, // Make them pill shaped without icons
                    ),
                    itemBuilder: (context, index) {
                      final cat = catProvider.categories[index];
                      return Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(50),
                          border: Border.all(color: AppColors.borderLight),
                          boxShadow: const [
                            BoxShadow(
                              color: AppColors.cardShadow,
                              blurRadius: 4,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ServiceSearchScreen(initialCategory: cat.name),
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(50),
                            child: Container(
                              alignment: Alignment.center,
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              child: Text(
                                cat.name,
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  );
                }
              ),

              const SizedBox(height: 48),

              // Top Providers Section
              const Text(
                'Top-Rated Professionals',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 14),
              Consumer<ServiceDirectoryProvider>(
                builder: (context, dirProvider, _) {
                  if (dirProvider.isLoading && dirProvider.topProviders.isEmpty) {
                    return Container(
                      height: 240,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.borderLight),
                      ),
                      child: const SizedBox(
                        height: 24, 
                        width: 24, 
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    );
                  }
                  
                  if (dirProvider.topProviders.isEmpty && !dirProvider.isLoading) {
                    return Container(
                      height: 240,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.borderLight),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.people_outline, size: 36, color: AppColors.textMuted.withOpacity(0.5)),
                          const SizedBox(height: 12),
                          const Text('No top-rated professionals in your area yet.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                        ],
                      ),
                    );
                  }

                  return SizedBox(
                    height: 240,
                    child: ListView.separated(
                      clipBehavior: Clip.none,
                      scrollDirection: Axis.horizontal,
                      itemCount: dirProvider.topProviders.length > 5 ? 5 : dirProvider.topProviders.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 16),
                      itemBuilder: (context, index) {
                         final provider = dirProvider.topProviders[index];
                         return SizedBox(
                           width: 330,
                           child: ProviderListingCard(
                             provider: provider,
                             onTap: () {
                               Navigator.push(
                                 context,
                                 MaterialPageRoute(
                                   builder: (_) => PublicProviderProfileScreen(providerId: provider.id),
                                 ),
                               );
                             },
                           )
                         );
                      }
                    )
                  );
                }
              ),

              const SizedBox(height: 48),

              // Popular Services Section
              const Text(
                'Trending Services',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 14),
              Consumer<ServiceDirectoryProvider>(
                builder: (context, dirProvider, _) {
                  if (dirProvider.isLoading && dirProvider.popularServices.isEmpty) {
                    return Container(
                      height: 280,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.borderLight),
                      ),
                      child: const SizedBox(
                        height: 24, 
                        width: 24, 
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    );
                  }
                  
                  if (dirProvider.popularServices.isEmpty && !dirProvider.isLoading) {
                    return Container(
                      height: 280,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.borderLight),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.home_repair_service_outlined, size: 36, color: AppColors.textMuted.withOpacity(0.5)),
                          const SizedBox(height: 12),
                          const Text("We haven't tracked any trending services yet.", style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                        ],
                      ),
                    );
                  }

                  return SizedBox(
                    height: 280,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: dirProvider.popularServices.length > 5 ? 5 : dirProvider.popularServices.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 16),
                      itemBuilder: (context, index) {
                         final listing = dirProvider.popularServices[index];
                         return SizedBox(
                           width: 330,
                           child: ServiceListingCard(
                             listing: listing,
                             onTap: () {
                               Navigator.push(
                                 context,
                                 MaterialPageRoute(
                                   builder: (_) => ServiceListingDetailsScreen(listing: listing),
                                 ),
                               );
                             },
                           )
                         );
                      }
                    )
                  );
                }
              ),

              const SizedBox(height: 48),

              // AI Assistant CTA Banner (Bolder Design)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20, offset: const Offset(0, 10)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                        boxShadow: [
                           BoxShadow(color: AppColors.primary.withOpacity(0.5), blurRadius: 12),
                        ]
                      ),
                      child: const Icon(Icons.auto_awesome, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Need help finding the right Pro?',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.white, letterSpacing: -0.3),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Chat with Handee AI to get instant recommendations and price estimates.',
                            style: TextStyle(fontSize: 13, color: Colors.white70, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
