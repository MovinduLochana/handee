import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/colors.dart';
import '../../data/models/service_category_model.dart';
import '../../data/repositories/service_category_repository.dart';
import '../../providers/job_request_provider.dart';
import '../../widgets/custom_button.dart';
import 'booking_tracker_screen.dart';

class CreateJobScreen extends StatefulWidget {
  final String? initialCategory;

  const CreateJobScreen({super.key, this.initialCategory});

  @override
  State<CreateJobScreen> createState() => _CreateJobScreenState();
}

class _CreateJobScreenState extends State<CreateJobScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descController = TextEditingController();
  final _minBudgetController = TextEditingController(text: '3000');
  final _maxBudgetController = TextEditingController(text: '8000');
  String _selectedUrgency = 'Medium';
  String _selectedLocation = AppConstants.serviceLocations[0];

  /// Locally picked images. NOT sent to the backend — see _pickPhoto.
  final List<XFile> _photos = [];
  final ImagePicker _imagePicker = ImagePicker();

  List<ServiceCategoryModel> _categories = [];
  String? _selectedCategoryId;
  bool _categoriesLoading = true;
  String? _categoriesError;

  bool _initialLoadStarted = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Deferred to didChangeDependencies so the ServiceCategoryRepository is
    // resolvable from the widget tree; guarded so it runs only once.
    if (!_initialLoadStarted) {
      _initialLoadStarted = true;
      _loadCategories();
    }
  }

  /// Categories come from GET /service-categories. The backend requires a real
  /// ServiceCategory Guid, so there is no offline/hardcoded fallback here —
  /// without the real list we cannot build a valid submission at all.
  Future<void> _loadCategories() async {
    final repo = context.read<ServiceCategoryRepository>();

    setState(() {
      _categoriesLoading = true;
      _categoriesError = null;
    });

    try {
      final categories = await repo.getCategories();

      if (!mounted) return;
      setState(() {
        _categories = categories;
        _categoriesLoading = false;
        _selectedCategoryId = _matchInitialCategory(categories);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _categoriesLoading = false;
        _categoriesError = 'Could not load service categories. $e';
      });
    }
  }

  /// Callers still pass a category *name* (e.g. from a home-screen tile), so
  /// match it against the real list to preselect the corresponding Guid.
  String? _matchInitialCategory(List<ServiceCategoryModel> categories) {
    if (categories.isEmpty) return null;
    final initial = widget.initialCategory;
    if (initial == null) return categories.first.id;

    for (final c in categories) {
      if (c.name.toLowerCase() == initial.toLowerCase()) return c.id;
    }
    return categories.first.id;
  }

  @override
  void dispose() {
    _descController.dispose();
    _minBudgetController.dispose();
    _maxBudgetController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    try {
      final picked = await _imagePicker.pickImage(source: source, imageQuality: 80);
      if (picked == null || !mounted) return;
      setState(() => _photos.add(picked));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not pick image: $e')),
      );
    }
  }

  Future<void> _submitJob() async {
    if (!_formKey.currentState!.validate()) return;

    final categoryId = _selectedCategoryId;
    if (categoryId == null || categoryId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a service category')),
      );
      return;
    }

    final provider = context.read<JobRequestProvider>();
    final minBudget = double.tryParse(_minBudgetController.text.trim());
    final maxBudget = double.tryParse(_maxBudgetController.text.trim());

    // TODO(backend): photoUrls is intentionally left empty. CreateJobRequestDto
    // expects real, reachable URLs, and no job-request image upload endpoint
    // exists yet (/users/me/photo overwrites the avatar; /reviews/{id}/photos
    // needs an existing review). IStorageService.UploadAsync already exists
    // server-side, so this needs a controller endpoint, then wire the picked
    // files here and send the returned URLs.
    final request = await provider.submitInstantMatch(
      serviceCategoryId: categoryId,
      description: _descController.text.trim(),
      location: _selectedLocation,
      urgency: _selectedUrgency,
      budgetMin: minBudget,
      budgetMax: maxBudget,
    );

    if (request != null && mounted) {
      provider.setCurrentTrackedRequest(request);
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const BookingTrackerScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final jobProvider = context.watch<JobRequestProvider>();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Request Instant Match'),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            children: [
              // Info banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primaryUltraLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primaryLight.withOpacity(0.5)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.bolt, color: AppColors.primary, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'AI agents will instantly analyze your issue, verify price bounds, and dispatch the closest qualified tradesperson.',
                        style: TextStyle(fontSize: 12, color: AppColors.primaryDark, height: 1.35),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Category Picker
              const Text(
                'Service Category',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              if (_categoriesLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 12),
                      Text(
                        'Loading service categories...',
                        style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                )
              else if (_categoriesError != null)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.errorLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, size: 18, color: AppColors.error),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _categoriesError!,
                          style: const TextStyle(fontSize: 12, color: AppColors.error),
                        ),
                      ),
                      TextButton(
                        onPressed: _loadCategories,
                        child: const Text('Retry', style: TextStyle(fontSize: 12)),
                      ),
                    ],
                  ),
                )
              else
                DropdownButtonFormField<String>(
                  initialValue: _selectedCategoryId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.category_outlined, color: AppColors.textMuted),
                  ),
                  items: _categories.map((c) {
                    return DropdownMenuItem<String>(
                      value: c.id,
                      child: Text(c.name),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedCategoryId = val);
                  },
                  validator: (val) =>
                      (val == null || val.isEmpty) ? 'Please select a service category' : null,
                ),

              const SizedBox(height: 18),

              // Issue Description
              const Text(
                'Describe the Issue',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descController,
                maxLines: 4,
                decoration: const InputDecoration(
                  hintText: 'e.g. Water leaking rapidly under kitchen sink, pipe connection appears cracked. Need repair today.',
                  alignLabelWithHint: true,
                ),
                validator: (val) {
                  if (val == null || val.trim().length < 10) {
                    return 'Please describe the problem in at least 10 characters';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 18),

              // Urgency Selector
              const Text(
                'Urgency Level',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              Row(
                children: AppConstants.urgencyLevels.map((urg) {
                  final isSelected = _selectedUrgency == urg;
                  Color color;
                  if (urg == 'Emergency') {
                    color = AppColors.urgencyEmergency;
                  } else if (urg == 'High') {
                    color = AppColors.urgencyHigh;
                  } else if (urg == 'Medium') {
                    color = AppColors.urgencyMedium;
                  } else {
                    color = AppColors.urgencyLow;
                  }

                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: InkWell(
                        onTap: () => setState(() => _selectedUrgency = urg),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: isSelected ? color.withOpacity(0.15) : AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? color : AppColors.border,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            urg,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected ? color : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 18),

              // Location Selector
              const Text(
                'Service Location',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _selectedLocation,
                isExpanded: true,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.location_on_outlined, color: AppColors.textMuted),
                ),
                items: AppConstants.serviceLocations.map((loc) {
                  return DropdownMenuItem<String>(
                    value: loc,
                    child: Text(loc, overflow: TextOverflow.ellipsis),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedLocation = val);
                },
              ),

              const SizedBox(height: 18),

              // Budget Range
              const Text(
                'Estimated Budget (LKR / Rs.)',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _minBudgetController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Min (Rs.)',
                        prefixText: 'Rs. ',
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Enter min';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _maxBudgetController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Max (Rs.)',
                        prefixText: 'Rs. ',
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Enter max';
                        return null;
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 18),

              // Photo Attachments
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Attach Photos (Optional)',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                  ),
                  TextButton.icon(
                    onPressed: _pickPhoto,
                    icon: const Icon(Icons.add_a_photo_outlined, size: 16),
                    label: const Text('Add Photo', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
              if (_photos.isNotEmpty) ...[
                SizedBox(
                  height: 88,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _photos.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      final photo = _photos[i];
                      return Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.file(
                              File(photo.path),
                              width: 88,
                              height: 88,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 2,
                            right: 2,
                            child: GestureDetector(
                              onTap: () => setState(() => _photos.removeAt(i)),
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, size: 14, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Photos are previewed locally only — uploading them is not yet '
                  'supported by the backend, so they are not sent with this request.',
                  style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ] else
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderLight, style: BorderStyle.solid),
                  ),
                  child: const Center(
                    child: Text(
                      'No photos attached yet.',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                  ),
                ),

              const SizedBox(height: 32),

              CustomButton(
                text: 'Submit Instant Match Request',
                icon: Icons.flash_on,
                isLoading: jobProvider.isSubmitting,
                onPressed: _submitJob,
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
