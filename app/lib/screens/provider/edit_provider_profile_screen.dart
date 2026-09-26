import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../providers/service_category_provider.dart';
import '../../providers/service_directory_provider.dart';
import '../../widgets/custom_button.dart';

class EditProviderProfileScreen extends StatefulWidget {
  const EditProviderProfileScreen({super.key});

  @override
  State<EditProviderProfileScreen> createState() => _EditProviderProfileScreenState();
}

class _EditProviderProfileScreenState extends State<EditProviderProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _headlineController;
  late TextEditingController _experienceController;
  late TextEditingController _rateController;
  late TextEditingController _cityController;
  late TextEditingController _bioController;

  final Set<String> _selectedCategories = {};
  final Set<String> _selectedLanguages = {'English', 'Sinhala'};
  bool _isAvailable = true;

  final List<String> _allLanguages = ['English', 'Sinhala', 'Tamil'];

  @override
  void initState() {
    super.initState();
    final dirProvider = context.read<ServiceDirectoryProvider>();
    final profile = dirProvider.myProfile;

    _headlineController = TextEditingController(
      text: profile?.headline ?? 'Master Plumber & AC Repair Specialist',
    );
    _experienceController = TextEditingController(
      text: (profile?.yearsOfExperience ?? 10).toString(),
    );
    _rateController = TextEditingController(
      text: (profile?.hourlyRate ?? 2500).toInt().toString(),
    );
    _cityController = TextEditingController(
      text: profile?.serviceArea ?? 'Colombo & Western Province',
    );
    _bioController = TextEditingController(
      text: profile?.bio ??
          'Certified technician with 10+ years of hands-on experience in residential and commercial maintenance across Colombo.',
    );

    if (profile != null) {
      _selectedCategories.addAll(profile.skillCategories);
      _selectedLanguages.addAll(profile.languages);
      _isAvailable = profile.isOnline;
    } else {
      _selectedCategories.addAll(['Plumbing', 'AC Repair']);
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ServiceDirectoryProvider>().loadMyProviderProfile();
      context.read<ServiceCategoryProvider>().fetchCategories();
    });
  }

  @override
  void dispose() {
    _headlineController.dispose();
    _experienceController.dispose();
    _rateController.dispose();
    _cityController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategories.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one trade category.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final dirProvider = context.read<ServiceDirectoryProvider>();
    final catProvider = context.read<ServiceCategoryProvider>();

    // Map selected category names to backend GUIDs
    final categoryIds = <String>[];
    for (final catName in _selectedCategories) {
      final match = catProvider.categories.where((c) => c.name.toLowerCase() == catName.toLowerCase());
      if (match.isNotEmpty) {
        categoryIds.add(match.first.id);
      }
    }

    final success = await dirProvider.updateMyProviderProfile(
      headline: _headlineController.text.trim(),
      yearsOfExperience: int.tryParse(_experienceController.text.trim()) ?? 1,
      hourlyRate: double.tryParse(_rateController.text.trim()) ?? 2000,
      city: _cityController.text.trim(),
      addressLine1: _cityController.text.trim(),
      bio: _bioController.text.trim(),
      description: _bioController.text.trim(),
      servicesOffered: _selectedCategories.toList(),
      languages: _selectedLanguages.toList(),
      isAvailableForWork: _isAvailable,
      serviceCategoryIds: categoryIds.isNotEmpty ? categoryIds : null,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Provider profile & trade details updated successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final catProvider = context.watch<ServiceCategoryProvider>();
    final dirProvider = context.watch<ServiceDirectoryProvider>();

    final availableCategories = catProvider.categories.isNotEmpty
        ? catProvider.categories.map((c) => c.name).toList()
        : ['Plumbing', 'Electrical', 'AC Repair', 'Carpentry', 'Painting', 'Cleaning', 'Masonry', 'Appliance Repair'];

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Manage Trade Profile'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header verification status card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primaryUltraLight,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.primaryLight),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.verified, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Tradesperson (NVQ-4 Vetted)',
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.primaryDark),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Verified identity & background checked in Sri Lanka',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Availability Toggle
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: _isAvailable ? AppColors.successLight : AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _isAvailable ? AppColors.success : AppColors.border,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _isAvailable ? Icons.flash_on : Icons.flash_off,
                            color: _isAvailable ? AppColors.success : AppColors.textMuted,
                            size: 22,
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _isAvailable ? 'Available for Instant Dispatch' : 'Currently Offline',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  color: _isAvailable ? AppColors.success : AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _isAvailable
                                    ? 'Incoming customer job offers will ring'
                                    : 'You will not receive new dispatches',
                                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Switch(
                        value: _isAvailable,
                        activeColor: AppColors.success,
                        onChanged: (val) => setState(() => _isAvailable = val),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                const Text(
                  'Professional Headline',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _headlineController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Certified Master Electrician & AC Tech',
                    prefixIcon: Icon(Icons.badge_outlined, color: AppColors.textMuted),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Please enter your professional headline';
                    return null;
                  },
                ),
                const SizedBox(height: 18),

                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Experience (Years)',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _experienceController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              hintText: 'e.g. 8',
                              prefixIcon: Icon(Icons.history_edu, color: AppColors.textMuted),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) return 'Enter years';
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Base Rate (LKR / hr)',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _rateController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              hintText: 'e.g. 2500',
                              prefixIcon: Icon(Icons.payments_outlined, color: AppColors.textMuted),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) return 'Enter rate';
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                const Text(
                  'Service Area / City',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _cityController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Colombo Metro Area, Gampaha, Kandy',
                    prefixIcon: Icon(Icons.location_city_outlined, color: AppColors.textMuted),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Enter your operating city';
                    return null;
                  },
                ),
                const SizedBox(height: 22),

                // Trade Skills & Categories selection
                const Text(
                  'Trade Categories & Skills',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Select the services you are certified and equipped to perform:',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: availableCategories.map((category) {
                    final isSelected = _selectedCategories.contains(category);
                    return FilterChip(
                      label: Text(category),
                      selected: isSelected,
                      selectedColor: AppColors.primaryUltraLight,
                      checkmarkColor: AppColors.primary,
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? AppColors.primary : AppColors.textPrimary,
                      ),
                      onSelected: (selected) {
                        setState(() {
                          if (selected) {
                            _selectedCategories.add(category);
                          } else {
                            _selectedCategories.remove(category);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 22),

                // Languages
                const Text(
                  'Languages Spoken',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  children: _allLanguages.map((lang) {
                    final isSelected = _selectedLanguages.contains(lang);
                    return FilterChip(
                      label: Text(lang),
                      selected: isSelected,
                      selectedColor: AppColors.primaryUltraLight,
                      checkmarkColor: AppColors.primary,
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? AppColors.primary : AppColors.textPrimary,
                      ),
                      onSelected: (selected) {
                        setState(() {
                          if (selected) {
                            _selectedLanguages.add(lang);
                          } else {
                            _selectedLanguages.remove(lang);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 22),

                const Text(
                  'Professional Bio & Experience',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _bioController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Describe your hands-on experience, equipment, and customer guarantee...',
                    alignLabelWithHint: true,
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Please provide a brief bio';
                    return null;
                  },
                ),
                const SizedBox(height: 32),

                CustomButton(
                  text: 'Save Provider Details',
                  isLoading: dirProvider.isLoading,
                  onPressed: _handleSave,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
