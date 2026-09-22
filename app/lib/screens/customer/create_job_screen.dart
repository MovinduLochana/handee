import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/constants/colors.dart';
import '../../providers/job_request_provider.dart';
import '../../providers/service_category_provider.dart';
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
  String? _selectedCategory;
  final _descController = TextEditingController();
  final _minBudgetController = TextEditingController(text: '3000');
  final _maxBudgetController = TextEditingController(text: '8000');
  String _selectedUrgency = 'Medium';
  String _selectedLocation = AppConstants.serviceLocations[0];
  final List<String> _photos = [];

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory;
  }

  @override
  void dispose() {
    _descController.dispose();
    _minBudgetController.dispose();
    _maxBudgetController.dispose();
    super.dispose();
  }

  void _addMockPhoto() {
    setState(() {
      _photos.add('photo_${_photos.length + 1}.jpg');
    });
  }

  Future<void> _submitJob() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategory == null) return; // Add null check for category

    final provider = context.read<JobRequestProvider>();
    final minBudget = double.tryParse(_minBudgetController.text.trim());
    final maxBudget = double.tryParse(_maxBudgetController.text.trim());

    final request = await provider.submitInstantMatch(
      category: _selectedCategory!,
      description: _descController.text.trim(),
      location: _selectedLocation,
      urgency: _selectedUrgency,
      budgetMin: minBudget,
      budgetMax: maxBudget,
      photoUrls: _photos,
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
              DropdownButtonFormField<String>(
                initialValue: _selectedCategory,
                isExpanded: true,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.category_outlined, color: AppColors.textMuted),
                ),
                items: [
                  if (_selectedCategory == 'Unknown Category')
                    DropdownMenuItem<String>(
                      value: 'Unknown Category',
                      child: Text('Unknown Category'), 
                    ),
                  ...context.watch<ServiceCategoryProvider>().categories.map((c) {
                  return DropdownMenuItem<String>(
                    value: c.name,
                    child: Text(c.name),
                  );
                })],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
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
                    onPressed: _addMockPhoto,
                    icon: const Icon(Icons.add_a_photo_outlined, size: 16),
                    label: const Text('Add Photo', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
              if (_photos.isNotEmpty)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _photos.map((p) {
                    return Chip(
                      avatar: const Icon(Icons.image, size: 16),
                      label: Text(p, style: const TextStyle(fontSize: 12)),
                      onDeleted: () => setState(() => _photos.remove(p)),
                    );
                  }).toList(),
                )
              else
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderLight, style: BorderStyle.solid),
                  ),
                  child: const Center(
                    child: Text(
                      'No photos attached yet. Photos help AI estimate scope accurately.',
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
