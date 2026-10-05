import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';
import '../data/models/provider_profile_model.dart';

class ProviderListingCard extends StatelessWidget {
  final ProviderProfileModel provider;
  final VoidCallback onTap;
  final String? actionLabel;

  const ProviderListingCard({
    super.key,
    required this.provider,
    required this.onTap,
    this.actionLabel,
  });

  @override
  Widget build(BuildContext context) {
    final skillsText = provider.skillCategories.isNotEmpty
        ? provider.skillCategories.join(' · ')
        : (provider.servicesOffered.isNotEmpty
            ? provider.servicesOffered.join(' · ')
            : 'Categories not set');
    final hourlyRate = provider.hourlyRate;
    final rateText = hourlyRate != null && hourlyRate > 0
        ? 'Rs. ${hourlyRate.toInt()} / hr'
        : 'Custom Job Quotes';
    final expText = provider.yearsOfExperience > 0
        ? '${provider.yearsOfExperience} yrs exp'
        : 'Experience not set';
    final headlineText = provider.headline?.isNotEmpty == true
        ? provider.headline!
        : (provider.fullName.isNotEmpty
            ? '${provider.fullName} • Verified Trade Specialist'
            : 'Add your trade headline');

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: const [
          BoxShadow(
            color: AppColors.cardShadow,
            blurRadius: 16,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Section: Avatar & Info
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Avatar
                    Container(
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.borderLight, width: 2),
                        image: provider.fullProfilePhotoUrl != null
                            ? DecorationImage(
                                image: NetworkImage(provider.fullProfilePhotoUrl!),
                                fit: BoxFit.cover,
                              )
                            : null,
                        color: AppColors.primaryUltraLight,
                      ),
                      child: provider.fullProfilePhotoUrl == null
                          ? const Icon(Icons.person, color: AppColors.primaryLight, size: 30)
                          : null,
                    ),
                    const SizedBox(width: 14),
                    // Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  provider.fullName,
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.4,
                                    color: AppColors.textPrimary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (provider.isVerified)
                                const Padding(
                                  padding: EdgeInsets.only(left: 4),
                                  child: Icon(Icons.verified, color: AppColors.primary, size: 16),
                                ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            headlineText,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded, color: Colors.amber, size: 15),
                              const SizedBox(width: 3),
                              Text(
                                provider.rating.toStringAsFixed(1),
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                ' (${provider.totalReviews} reviews)',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textMuted,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.location_on_outlined, color: AppColors.textMuted, size: 13),
                              const SizedBox(width: 2),
                              Expanded(
                                child: Text(
                                  provider.serviceArea,
                                  style: const TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 12),
                
                // Qualifications / Metas Row: Skills, Exp, Rate
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.borderLight.withOpacity(0.6)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.verified_outlined, size: 13, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '$skillsText  ·  $expText  ·  $rateText',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 10),

                // Skills Chips Section (if categories set)
                if (provider.skillCategories.isNotEmpty) ...[
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: provider.skillCategories.take(3).map((skill) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primaryUltraLight.withOpacity(0.6),
                          borderRadius: BorderRadius.circular(7),
                        ),
                        child: Text(
                          skill,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),
                ],
                const Divider(height: 1, color: AppColors.borderLight),
                const SizedBox(height: 12),
                
                // Bottom CTA Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle_outline, color: AppColors.success, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          '${provider.completedJobs} Jobs done',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            actionLabel ?? 'View Profile',
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.arrow_forward_rounded, size: 14, color: Colors.white),
                        ],
                      ),
                    ),

                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
