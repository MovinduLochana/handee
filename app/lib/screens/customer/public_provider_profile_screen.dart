import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/colors.dart';
import '../../../data/models/provider_profile_model.dart';
import '../../../data/models/review_model.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/review_provider.dart';
import '../../../providers/service_directory_provider.dart';
import '../../../widgets/review_card.dart';
import '../../../widgets/service_listing_card.dart';
import '../../../widgets/write_review_bottom_sheet.dart';
import '../provider/edit_provider_profile_screen.dart';
import 'service_listing_details_screen.dart';

class PublicProviderProfileScreen extends StatefulWidget {
  final String providerId;
  final ProviderProfileModel? initialProfile;
  final bool isOwnProfile;

  const PublicProviderProfileScreen({
    super.key,
    required this.providerId,
    this.initialProfile,
    this.isOwnProfile = false,
  });

  @override
  State<PublicProviderProfileScreen> createState() => _PublicProviderProfileScreenState();
}

class _PublicProviderProfileScreenState extends State<PublicProviderProfileScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ServiceDirectoryProvider>().fetchProviderProfile(widget.providerId);
      final reviewProv = Provider.of<ReviewProvider?>(context, listen: false);
      reviewProv?.fetchReviews(widget.providerId);
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  bool _isOwnProfile(ProviderProfileModel provider, AuthProvider? auth, ServiceDirectoryProvider providerData) {
    if (widget.isOwnProfile) return true;
    final currentUserId = (auth?.isProvider == true) ? auth?.currentUser?.id : null;
    return provider.isOwnedBy(
      userId: currentUserId,
      profileId: providerData.myProfile?.id,
    );
  }


  Future<void> _handleEditReview(ReviewModel review, String providerName) async {
    final updated = await WriteReviewBottomSheet.show(
      context,
      providerId: widget.providerId,
      providerName: providerName,
      existingReview: review,
    );
    if (!mounted) return;
    if (updated == true) {
      context.read<ServiceDirectoryProvider>().fetchProviderProfile(widget.providerId);
    }
  }

  Future<void> _handleDeleteReview(ReviewModel review) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Delete Review'),
        content: const Text('Are you sure you want to delete your review? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            key: const Key('confirm_delete_review_button'),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            onPressed: () => Navigator.pop(dialogCtx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (!mounted) return;
    if (confirmed == true) {
      final reviewProv = Provider.of<ReviewProvider?>(context, listen: false);
      if (reviewProv != null) {
        try {
          await reviewProv.deleteReview(
            providerId: widget.providerId,
            reviewId: review.id,
          );
          if (!mounted) return;
          context.read<ServiceDirectoryProvider>().fetchProviderProfile(widget.providerId);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Review deleted successfully.'),
              backgroundColor: AppColors.success,
            ),
          );
        } catch (e) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete review: $e'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Consumer<ServiceDirectoryProvider>(
        builder: (context, providerData, child) {
          if (providerData.isLoading && widget.initialProfile == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final provider = providerData.selectedProvider ?? widget.initialProfile;
          if (provider == null) {
            return Scaffold(
              backgroundColor: AppColors.background,
              appBar: AppBar(
                title: const Text('Provider Profile'),
              ),
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.person_off_outlined, size: 56, color: AppColors.textMuted),
                      const SizedBox(height: 14),
                      const Text(
                        "Provider Profile Unavailable",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "We couldn't find this provider's profile. They may have deactivated their account.",
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                      ),
                      const SizedBox(height: 20),
                      OutlinedButton.icon(
                        onPressed: () => context.read<ServiceDirectoryProvider>().fetchProviderProfile(widget.providerId),
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }

          final services = providerData.selectedProviderServices;
          final bannerHeight = MediaQuery.sizeOf(context).width;

          final auth = Provider.of<AuthProvider?>(context);
          final reviewProv = Provider.of<ReviewProvider?>(context);
          final currentUserId = auth?.currentUser?.id ?? auth?.storage.getUserId();
          final isOwn = _isOwnProfile(provider, auth, providerData);
          final canWriteReview = !isOwn && ((auth == null) || (auth.isAuthenticated && auth.isCustomer));

          return CustomScrollView(
            controller: _scrollController,
            slivers: [
              SliverAppBar(
                expandedHeight: bannerHeight,
                pinned: true,
                actions: [
                  if (isOwn)
                    IconButton(
                      key: const Key('appbar_edit_provider_profile_button'),
                      icon: const Icon(Icons.edit_outlined, color: Colors.white),
                      tooltip: 'Edit Profile',
                      onPressed: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const EditProviderProfileScreen()),
                        );
                        if (!context.mounted) return;
                        context.read<ServiceDirectoryProvider>().fetchProviderProfile(widget.providerId);
                      },
                    ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(color: AppColors.primaryUltraLight),
                      if (provider.fullProfilePhotoUrl != null)
                        TweenAnimationBuilder<double>(
                          tween: Tween<double>(begin: 1.1, end: 1.0),
                          duration: const Duration(milliseconds: 1500),
                          curve: Curves.easeOutQuart,
                          builder: (context, scale, child) {
                            return Transform.scale(
                              scale: scale,
                              child: child,
                            );
                          },
                          child: Image.network(
                            provider.fullProfilePhotoUrl!,
                            fit: BoxFit.cover,
                          ),
                        )
                      else
                        const Icon(Icons.person, size: 100, color: AppColors.primaryLight),
                      // Gradient overlay
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              AppColors.textPrimary.withOpacity(0.95),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 12,
                        left: 16,
                        right: 16,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  provider.fullName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 36,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -1.5,
                                    height: 1.1,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.verified, color: Colors.white, size: 20),
                              ],
                            ),
                            if (provider.headline != null && provider.headline!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(provider.headline!, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: -0.3)),
                            ],
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.star, color: Colors.amber, size: 16),
                                const SizedBox(width: 4),
                                Text(
                                  '${provider.rating.toStringAsFixed(1)} (${provider.totalReviews} reviews) · ${provider.completedJobs} Jobs done',
                                  style: const TextStyle(color: Colors.white, fontSize: 13),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Highlights Section
                      if (provider.yearsOfExperience > 0 || provider.languages.isNotEmpty) ...[
                        Row(
                          children: [
                            if (provider.yearsOfExperience > 0)
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Row(
                                      children: [
                                        Icon(Icons.work_outline, size: 16, color: AppColors.primary),
                                        SizedBox(width: 4),
                                        Text('Experience', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    TweenAnimationBuilder<double>(
                                      tween: Tween<double>(begin: 0, end: provider.yearsOfExperience.toDouble()),
                                      duration: const Duration(milliseconds: 1800),
                                      curve: Curves.easeOutExpo,
                                      builder: (context, val, _) {
                                        return Text('${val.toInt()}+ YRS', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: AppColors.textPrimary));
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            if (provider.languages.isNotEmpty)
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Row(
                                      children: [
                                        Icon(Icons.chat_bubble_outline, size: 16, color: AppColors.primary),
                                        SizedBox(width: 4),
                                        Text('Languages', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(provider.languages.length > 2 ? '${provider.languages.length} Langs' : provider.languages.join(', '), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: AppColors.textPrimary)),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        const Divider(height: 1, thickness: 1, color: AppColors.borderLight),
                        const SizedBox(height: 14),
                      ],

                      // Bio Section
                      const Row(
                        children: [
                          Icon(Icons.person_pin, size: 28, color: AppColors.primary),
                          SizedBox(width: 8),
                          Text(
                            'About',
                            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1.0, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        provider.description ?? provider.bio ?? "This provider hasn't added an overview yet.",
                        style: const TextStyle(fontSize: 16, color: AppColors.textSecondary, height: 1.6),
                      ),
                      const SizedBox(height: 14),
                      const Divider(height: 1, thickness: 1, color: AppColors.borderLight),
                      const SizedBox(height: 14),
                      
                      // Skills Section
                      const Row(
                        children: [
                          Icon(Icons.military_tech, size: 28, color: AppColors.primary),
                          SizedBox(width: 8),
                          Text(
                            'Expertise',
                            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1.0, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: provider.skillCategories.map((skill) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.textPrimary,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(color: AppColors.textPrimary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4)),
                              ]
                            ),
                            child: Text(
                              skill,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 14),
                      const Divider(height: 1, thickness: 1, color: AppColors.borderLight),
                      const SizedBox(height: 14),
                      
                      // Services Section
                      const Row(
                        children: [
                          Icon(Icons.design_services, size: 28, color: AppColors.primary),
                          SizedBox(width: 8),
                          Text(
                            'Bookable Services',
                            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1.0, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      if (services.isEmpty)
                        const Text("This provider hasn't added any services yet.", style: TextStyle(color: AppColors.textSecondary))
                      else
                        SizedBox(
                          height: 280,
                          child: ListView.separated(
                            padding: EdgeInsets.zero,
                            scrollDirection: Axis.horizontal,
                            itemCount: services.length,
                            separatorBuilder: (context, index) => const SizedBox(width: 16),
                            itemBuilder: (context, index) {
                              final listing = services[index];
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
                                ),
                              );
                            },
                          ),
                        ),
                      const SizedBox(height: 14),
                      const Divider(height: 1, thickness: 1, color: AppColors.borderLight),
                      const SizedBox(height: 14),

                      // Customer Reviews Section
                      Row(
                        children: [
                          const Icon(Icons.star, size: 24, color: Colors.amber),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Customer Reviews',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.5,
                                color: AppColors.textPrimary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          if (canWriteReview)
                            IconButton(
                              key: const Key('write_review_button'),
                              tooltip: 'Write a Review',
                              icon: const Icon(Icons.rate_review_outlined, size: 22, color: AppColors.primary),
                              style: IconButton.styleFrom(
                                backgroundColor: AppColors.primaryUltraLight,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              onPressed: () async {
                                final submitted = await WriteReviewBottomSheet.show(
                                  context,
                                  providerId: widget.providerId,
                                  providerName: provider.fullName,
                                );
                                if (!context.mounted) return;
                                if (submitted == true) {
                                  context.read<ServiceDirectoryProvider>().fetchProviderProfile(widget.providerId);
                                }
                              },
                            )
                          else if (isOwn && reviewProv != null && reviewProv.totalReviewsFor(widget.providerId) > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primaryUltraLight,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${reviewProv.totalReviewsFor(widget.providerId)} reviews',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primaryDark,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      if (reviewProv != null) ...[
                        if (reviewProv.isLoading && reviewProv.reviewsFor(widget.providerId).isEmpty)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24.0),
                              child: CircularProgressIndicator(),
                            ),
                          )
                        else if (reviewProv.reviewsFor(widget.providerId).isEmpty)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.borderLight),
                            ),
                            child: Column(
                              children: [
                                const Icon(Icons.rate_review_outlined, size: 40, color: AppColors.textMuted),
                                const SizedBox(height: 8),
                                const Text(
                                  'No Reviews Yet',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${provider.fullName} is new or has not received client reviews yet.',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                ),
                                if (canWriteReview) ...[
                                  const SizedBox(height: 14),
                                  OutlinedButton.icon(
                                    onPressed: () async {
                                      final submitted = await WriteReviewBottomSheet.show(
                                        context,
                                        providerId: widget.providerId,
                                        providerName: provider.fullName,
                                      );
                                      if (!context.mounted) return;
                                      if (submitted == true) {
                                        context.read<ServiceDirectoryProvider>().fetchProviderProfile(widget.providerId);
                                      }
                                    },
                                    icon: const Icon(Icons.rate_review_outlined, size: 16),
                                    label: const Text('Leave the First Review'),
                                  ),
                                ],
                              ],
                            ),
                          )
                        else
                          Column(
                            children: reviewProv
                                .reviewsFor(widget.providerId)
                                .map((r) => ReviewCard(
                                      review: r,
                                      isOwnReview: currentUserId != null && r.customerId == currentUserId,
                                      onEdit: () => _handleEditReview(r, provider.fullName),
                                      onDelete: () => _handleDeleteReview(r),
                                    ))
                                .toList(),
                          ),
                      ],
                      const SizedBox(height: 90),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      bottomSheet: Consumer<ServiceDirectoryProvider>(
        builder: (context, providerData, child) {
          final provider = providerData.selectedProvider ?? widget.initialProfile;
          if (provider == null) return const SizedBox.shrink();

          final auth = Provider.of<AuthProvider?>(context);
          final isOwn = _isOwnProfile(provider, auth, providerData);

          return TweenAnimationBuilder<double>(
             tween: Tween<double>(begin: 150, end: 0),
             duration: const Duration(milliseconds: 800),
             curve: Curves.elasticOut,
             builder: (context, yOffset, child) {
               return Transform.translate(
                 offset: Offset(0, yOffset),
                 child: child,
               );
             },
             child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: AppColors.borderLight)),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.cardShadow,
                    blurRadius: 24,
                    offset: Offset(0, -8),
                  ),
                ],
              ),
              child: SafeArea(
                child: TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0.8, end: 1.0),
                  duration: const Duration(milliseconds: 600),
                  curve: Curves.elasticOut,
                  builder: (context, scale, btnChild) {
                    return Transform.scale(
                      scale: scale,
                      child: btnChild,
                    );
                  },
                  child: isOwn
                      ? ElevatedButton.icon(
                          key: const Key('provider_public_profile_edit_button'),
                          onPressed: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const EditProviderProfileScreen()),
                            );
                            if (!context.mounted) return;
                            context.read<ServiceDirectoryProvider>().fetchProviderProfile(widget.providerId);
                          },
                          icon: const Icon(Icons.edit_outlined, size: 20),
                          label: const Text(
                            'Edit Profile',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 64),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        )
                      : ElevatedButton(
                          onPressed: () {
                            final services = providerData.selectedProviderServices;
                            if (services.isNotEmpty) {
                              if (_scrollController.hasClients) {
                                _scrollController.animateTo(
                                  _scrollController.position.maxScrollExtent,
                                  duration: const Duration(milliseconds: 600),
                                  curve: Curves.easeOutCubic,
                                );
                              }
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("This provider doesn't have any active service listings at the moment."),
                                  backgroundColor: AppColors.textPrimary,
                                ),
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 64),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.calendar_month, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Browse & Book Services',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                              ),
                            ],
                          ),
                        ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
