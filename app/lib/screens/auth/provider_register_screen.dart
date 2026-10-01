import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/repositories/provider_repository.dart';
import '../../providers/auth_provider.dart';
import '../../providers/service_category_provider.dart';
import '../../widgets/custom_button.dart';
import '../provider/provider_home_screen.dart';
import 'customer_register_screen.dart';

class ProviderRegisterScreen extends StatefulWidget {
  const ProviderRegisterScreen({super.key});

  @override
  State<ProviderRegisterScreen> createState() => _ProviderRegisterScreenState();
}

class _ProviderRegisterScreenState extends State<ProviderRegisterScreen> {
  int _currentStep = 0;
  final _picker = ImagePicker();

  // Step 1: Credentials & Business Info
  final _formKey1 = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _headlineController = TextEditingController();
  final _experienceController = TextEditingController(text: '5');
  final _bioController = TextEditingController();
  bool _obscurePassword = true;

  // Step 2: Trade Categories & Service Area
  final Set<String> _selectedCategoryIds = {};
  final _cityController = TextEditingController(text: 'Colombo');
  double _serviceRadiusKm = 25.0;

  // Step 3: Identity & Certification Documents
  String? _nicFilePath;
  String? _certFilePath;

  // Submission state
  bool _isSubmitting = false;
  String? _submissionError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ServiceCategoryProvider>().fetchCategories();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _headlineController.dispose();
    _experienceController.dispose();
    _bioController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  Future<void> _pickNicDocument() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (!mounted) return;
      if (image != null) {
        setState(() => _nicFilePath = image.path);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to pick document: $e'), backgroundColor: AppColors.error),
      );
    }
  }

  Future<void> _pickCertDocument() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (!mounted) return;
      if (image != null) {
        setState(() => _certFilePath = image.path);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to pick document: $e'), backgroundColor: AppColors.error),
      );
    }
  }

  Future<void> _handleCompleteOnboarding() async {
    setState(() {
      _isSubmitting = true;
      _submissionError = null;
    });

    final auth = context.read<AuthProvider>();
    final providerRepo = context.read<ProviderRepository>();

    try {
      // 1. Register as Provider
      final regSuccess = await auth.register(
        fullName: _nameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
        role: 'Provider',
        phoneNumber: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
      );

      if (!regSuccess) {
        throw Exception(auth.errorMessage ?? 'Registration failed. Please verify your details.');
      }

      // 2. Fetch created provider profile
      final profile = await providerRepo.getMyProfile();

      // 3. Update profile with Trade categories, radius, headline, experience
      await providerRepo.updateMyProfile(
        profileId: profile.id,
        headline: _headlineController.text.trim().isNotEmpty ? _headlineController.text.trim() : null,
        bio: _bioController.text.trim().isNotEmpty ? _bioController.text.trim() : null,
        yearsOfExperience: int.tryParse(_experienceController.text.trim()) ?? 5,
        city: _cityController.text.trim(),
        serviceRadiusKm: _serviceRadiusKm,
        serviceCategoryIds: _selectedCategoryIds.isNotEmpty ? _selectedCategoryIds.toList() : null,
      );

      // 4. Upload NIC document if selected
      if (_nicFilePath != null && _nicFilePath!.isNotEmpty) {
        try {
          await providerRepo.uploadDocument(
            profileId: profile.id,
            filePath: _nicFilePath!,
            documentType: 'NIC',
          );
        } catch (e) {
          debugPrint('NIC upload warning: $e');
        }
      }

      // 5. Upload Trade Certification if selected
      if (_certFilePath != null && _certFilePath!.isNotEmpty) {
        try {
          await providerRepo.uploadDocument(
            profileId: profile.id,
            filePath: _certFilePath!,
            documentType: 'TradeCertification',
          );
        } catch (e) {
          debugPrint('Cert upload warning: $e');
        }
      }

      if (mounted) {
        // Navigate directly to Provider Home Screen
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const ProviderHomeScreen()),
          (route) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _submissionError = e.toString().replaceAll('Exception:', '').trim();
        });
      }
    }
  }

  void _nextStep() {
    if (_currentStep == 0) {
      if (!_formKey1.currentState!.validate()) return;
    } else if (_currentStep == 1) {
      if (_selectedCategoryIds.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please select at least one trade category.'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
    }

    setState(() {
      _currentStep++;
    });
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Tradesperson Onboarding'),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Step Progress Indicator
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: AppColors.surfaceElevated,
              child: Row(
                children: [
                  _buildStepIndicator(0, 'Account'),
                  _buildStepDivider(),
                  _buildStepIndicator(1, 'Trades & Area'),
                  _buildStepDivider(),
                  _buildStepIndicator(2, 'Documents'),
                ],
              ),
            ),

            if (_submissionError != null)
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.error.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _submissionError!,
                        style: const TextStyle(fontSize: 13, color: AppColors.error),
                      ),
                    ),
                  ],
                ),
              ),

            // Step Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: _buildCurrentStep(),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.borderLight)),
          ),
          child: Row(
            children: [
              if (_currentStep > 0) ...[
                OutlinedButton(
                  onPressed: _isSubmitting ? null : _prevStep,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  ),
                  child: const Text('Back'),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: CustomButton(
                  text: _currentStep == 2 ? 'Complete Onboarding' : 'Next Step',
                  isLoading: _isSubmitting,
                  onPressed: _currentStep == 2 ? _handleCompleteOnboarding : _nextStep,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepIndicator(int stepIndex, String title) {
    final isActive = _currentStep == stepIndex;
    final isDone = _currentStep > stepIndex;

    return Expanded(
      child: Column(
        children: [
          CircleAvatar(
            radius: 12,
            backgroundColor: isDone
                ? AppColors.success
                : isActive
                    ? AppColors.primary
                    : AppColors.textMuted.withOpacity(0.3),
            child: isDone
                ? const Icon(Icons.check, size: 14, color: Colors.white)
                : Text(
                    '${stepIndex + 1}',
                    style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
              color: isActive ? AppColors.primary : AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepDivider() {
    return Container(
      width: 24,
      height: 1,
      color: AppColors.border,
      margin: const EdgeInsets.symmetric(horizontal: 4),
    );
  }

  Widget _buildCurrentStep() {
    switch (_currentStep) {
      case 0:
        return _buildStep1Account();
      case 1:
        return _buildStep2TradesAndArea();
      case 2:
        return _buildStep3Documents();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildStep1Account() {
    return Form(
      key: _formKey1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Join Handee as a Pro',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 4),
          const Text(
            'Create your professional profile to receive customer job dispatches.',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: const Row(
              children: [
                Icon(Icons.badge_outlined, size: 18, color: AppColors.primary),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'One email can only register as one role (Provider). Customers register via the Customer portal.',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const Text('Full Name or Business Name', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              hintText: 'e.g. Sunil Perera (Sunil Electricals)',
              prefixIcon: Icon(Icons.business_outlined, color: AppColors.textMuted),
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter your full or business name' : null,
          ),
          const SizedBox(height: 16),

          const Text('Email Address', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              hintText: 'pro@example.lk',
              prefixIcon: Icon(Icons.email_outlined, color: AppColors.textMuted),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Please enter your email';
              if (!v.contains('@')) return 'Please enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: 16),

          const Text('Password', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            decoration: InputDecoration(
              hintText: 'At least 8 characters',
              prefixIcon: const Icon(Icons.lock_outline, color: AppColors.textMuted),
              suffixIcon: IconButton(
                icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
            validator: (v) => (v == null || v.length < 8) ? 'Password must be at least 8 characters' : null,
          ),
          const SizedBox(height: 16),

          const Text('Direct Mobile Number (for customer dispatches)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              hintText: '+94 77 987 6543',
              prefixIcon: Icon(Icons.phone_outlined, color: AppColors.textMuted),
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Phone number is required for dispatch dispatches' : null,
          ),
          const SizedBox(height: 16),

          const Text('Professional Headline', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _headlineController,
            decoration: const InputDecoration(
              hintText: 'e.g. Master Plumber & Solar Water Heater Specialist',
              prefixIcon: Icon(Icons.title_outlined, color: AppColors.textMuted),
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter a short professional headline' : null,
          ),
          const SizedBox(height: 16),

          const Text('Years of Experience', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _experienceController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              hintText: 'e.g. 5',
              prefixIcon: Icon(Icons.work_history_outlined, color: AppColors.textMuted),
            ),
          ),
          const SizedBox(height: 16),

          const Text('Short Bio / About Your Work', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _bioController,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Describe your expertise, certifications, and service standard...',
            ),
          ),
          const SizedBox(height: 20),

          // Switch to Customer link
          Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Looking for a service instead? ', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                GestureDetector(
                  onTap: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (_) => const CustomerRegisterScreen()),
                    );
                  },
                  child: const Text(
                    'Sign up as Customer',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2TradesAndArea() {
    final catProvider = context.watch<ServiceCategoryProvider>();
    final categories = catProvider.categories;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Trade Categories & Service Area',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 4),
        const Text(
          'Select the trade skills you offer and how far you are willing to travel.',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),

        const Text('Select Trade Categories (Required)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),

        if (catProvider.isLoading && categories.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(child: CircularProgressIndicator()),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: categories.map((cat) {
              final isSelected = _selectedCategoryIds.contains(cat.id);
              return FilterChip(
                label: Text(cat.name),
                selected: isSelected,
                selectedColor: AppColors.primaryUltraLight,
                checkmarkColor: AppColors.primary,
                labelStyle: TextStyle(
                  color: isSelected ? AppColors.primaryDark : AppColors.textPrimary,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  fontSize: 13,
                ),
                side: BorderSide(
                  color: isSelected ? AppColors.primary : AppColors.border,
                ),
                onSelected: (selected) {
                  setState(() {
                    if (selected) {
                      _selectedCategoryIds.add(cat.id);
                    } else {
                      _selectedCategoryIds.remove(cat.id);
                    }
                  });
                },
              );
            }).toList(),
          ),

        const SizedBox(height: 24),

        const Text('Primary Operating City / District', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        TextFormField(
          controller: _cityController,
          decoration: const InputDecoration(
            hintText: 'e.g. Colombo, Western Province',
            prefixIcon: Icon(Icons.place_outlined, color: AppColors.primary),
          ),
        ),

        const SizedBox(height: 24),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Service Radius', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            Text(
              '${_serviceRadiusKm.toInt()} km',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.primary),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Maximum distance you will travel to a customer site for Instant Match jobs.',
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        Slider(
          value: _serviceRadiusKm,
          min: 5,
          max: 100,
          divisions: 19,
          activeColor: AppColors.primary,
          label: '${_serviceRadiusKm.toInt()} km',
          onChanged: (val) => setState(() => _serviceRadiusKm = val),
        ),
      ],
    );
  }

  Widget _buildStep3Documents() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Identity & Verification Documents',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 4),
        const Text(
          'Upload your identity card and trade credentials for admin review to unlock dispatch offers.',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),

        // NIC Document Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _nicFilePath != null ? AppColors.success : AppColors.border,
              width: _nicFilePath != null ? 1.5 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: _nicFilePath != null ? AppColors.successLight : AppColors.primaryUltraLight,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _nicFilePath != null ? Icons.check_circle : Icons.badge_outlined,
                      color: _nicFilePath != null ? AppColors.success : AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('National Identity Card (NIC)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                        Text('Required for trust & safety verification', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_nicFilePath != null)
                Row(
                  children: [
                    const Icon(Icons.image, size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _nicFilePath!.split(Platform.pathSeparator).last,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18, color: AppColors.error),
                      onPressed: () => setState(() => _nicFilePath = null),
                    ),
                  ],
                ),
              OutlinedButton.icon(
                onPressed: _pickNicDocument,
                icon: const Icon(Icons.upload_file, size: 16),
                label: Text(_nicFilePath != null ? 'Change NIC Document' : 'Upload NIC (Photo/Document)'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(40),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Trade Certification Document Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _certFilePath != null ? AppColors.success : AppColors.border,
              width: _certFilePath != null ? 1.5 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: _certFilePath != null ? AppColors.successLight : AppColors.primaryUltraLight,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _certFilePath != null ? Icons.check_circle : Icons.verified_user_outlined,
                      color: _certFilePath != null ? AppColors.success : AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Trade / NVQ Certification (Optional)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                        Text('Accelerates approval and boosts customer rating', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_certFilePath != null)
                Row(
                  children: [
                    const Icon(Icons.image, size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _certFilePath!.split(Platform.pathSeparator).last,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18, color: AppColors.error),
                      onPressed: () => setState(() => _certFilePath = null),
                    ),
                  ],
                ),
              OutlinedButton.icon(
                onPressed: _pickCertDocument,
                icon: const Icon(Icons.upload_file, size: 16),
                label: Text(_certFilePath != null ? 'Change Certificate' : 'Upload NVQ/Trade Certificate'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(40),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.primaryUltraLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primaryLight),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.shield_outlined, color: AppColors.primary, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Once submitted, Handee administrators review your credentials. You will be able to manage service listings and explore dispatches while verification is being processed.',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
