import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/colors.dart';
import '../../../providers/service_directory_provider.dart';
import '../../../widgets/service_listing_card.dart';
import 'create_job_screen.dart';
import 'service_listing_details_screen.dart';

class PublicProviderProfileScreen extends StatefulWidget {
  final String providerId;

  const PublicProviderProfileScreen({super.key, required this.providerId});

  @override
  State<PublicProviderProfileScreen> createState() => _PublicProviderProfileScreenState();
}

class _PublicProviderProfileScreenState extends State<PublicProviderProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ServiceDirectoryProvider>().fetchProviderProfile(widget.providerId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Consumer<ServiceDirectoryProvider>(
        builder: (context, providerData, child) {
          if (providerData.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final provider = providerData.selectedProvider;
          if (provider == null) {
            return const Center(child: Text("We couldn't find this provider's profile. They may have deactivated their account."));
          }

          final services = providerData.selectedProviderServices;

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 400,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(color: AppColors.primaryUltraLight),
                      if (provider.fullProfilePhotoUrl != null)
                        TweenAnimationBuilder<double>(
                          tween: Tween<double>(begin: 1.2, end: 1.0),
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
                        bottom: 16,
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
                                  const Icon(Icons.verified, color: Colors.blueAccent, size: 20),
                              ],
                            ),
                            if (provider.headline != null && provider.headline!.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(provider.headline!, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: -0.3)),
                            ],
                            const SizedBox(height: 12),
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
                  padding: const EdgeInsets.all(24),
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
                                    Row(
                                      children: [
                                        const Icon(Icons.work_outline, size: 16, color: AppColors.primary),
                                        const SizedBox(width: 4),
                                        const Text('Experience', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
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
                                    Row(
                                      children: [
                                        const Icon(Icons.chat_bubble_outline, size: 16, color: AppColors.primary),
                                        const SizedBox(width: 4),
                                        const Text('Languages', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(provider.languages.length > 2 ? '${provider.languages.length} Langs' : provider.languages.join(', '), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: AppColors.textPrimary)),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        const Divider(height: 1, thickness: 1, color: AppColors.borderLight),
                        const SizedBox(height: 32),
                      ],

                      // Bio Section
                      Row(
                        children: [
                          const Icon(Icons.person_pin, size: 28, color: AppColors.primary),
                          const SizedBox(width: 8),
                          const Text(
                            'About',
                            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1.0, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        provider.description ?? provider.bio ?? "This provider hasn't added an overview yet.",
                        style: const TextStyle(fontSize: 16, color: AppColors.textSecondary, height: 1.6),
                      ),
                      const SizedBox(height: 32),
                      const Divider(height: 1, thickness: 1, color: AppColors.borderLight),
                      const SizedBox(height: 32),
                      
                      // Skills Section
                      Row(
                        children: [
                          const Icon(Icons.military_tech, size: 28, color: AppColors.primary),
                          const SizedBox(width: 8),
                          const Text(
                            'Expertise',
                            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1.0, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
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
                      const SizedBox(height: 32),
                      const Divider(height: 1, thickness: 1, color: AppColors.borderLight),
                      const SizedBox(height: 32),
                      
                      // Services Section
                      Row(
                        children: [
                          const Icon(Icons.design_services, size: 28, color: AppColors.primary),
                          const SizedBox(width: 8),
                          const Text(
                            'Bookable Services',
                            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1.0, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      if (services.isEmpty)
                        const Text("This provider hasn't added any services yet.", style: TextStyle(color: AppColors.textSecondary))
                      else
                        SizedBox(
                          height: 280,
                          child: ListView.separated(
                            padding: EdgeInsets.zero,
                            scrollDirection: Axis.horizontal,
                            itemCount: services.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 16),
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
                      const SizedBox(height: 160),
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
           if (providerData.selectedProvider == null) return const SizedBox.shrink();
           
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
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                border: const Border(top: BorderSide(color: AppColors.borderLight)),
                boxShadow: const [
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
                  child: ElevatedButton(
                    onPressed: () {
                      final initialCat = providerData.selectedProvider!.skillCategories.isNotEmpty 
                          ? providerData.selectedProvider!.skillCategories.first 
                          : null;
                          
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => CreateJobScreen(initialCategory: initialCat),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 64),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text('Book this Pro', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
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
