import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/models/service_category_model.dart';
import '../../data/repositories/service_category_repository.dart';
import '../../providers/job_request_provider.dart';
import '../../widgets/custom_button.dart';
import 'booking_tracker_screen.dart';
import 'location_picker_screen.dart';

class CreateJobScreen extends StatefulWidget {
  final String? initialCategory;
  final String? initialAddress;
  final double? initialLatitude;
  final double? initialLongitude;
  final bool initialLocationConfirmed;

  const CreateJobScreen({
    super.key,
    this.initialCategory,
    this.initialAddress,
    this.initialLatitude,
    this.initialLongitude,
    this.initialLocationConfirmed = false,
  });

  @override
  State<CreateJobScreen> createState() => _CreateJobScreenState();
}

class _CreateJobScreenState extends State<CreateJobScreen> {
  final _formKey = GlobalKey<FormState>();
  final PageController _pageController = PageController();
  int _currentStep = 0;

  static const List<String> _stepTitles = [
    'Category & Issue',
    'Location & Access',
    'Urgency & Budget',
    'Review & Confirm',
  ];

  // Step 0: Category & Problem
  String? _selectedCategoryId;
  final TextEditingController _descController = TextEditingController();
  final Set<String> _selectedChips = <String>{};

  // Step 1: Location & Logistics
  late String _serviceAddress;
  late double? _latitude;
  late double? _longitude;
  late bool _isLocationConfirmed;
  final TextEditingController _landmarkController = TextEditingController();

  // Step 2: Urgency, Budget & Photos
  String _selectedUrgency = 'Medium';
  RangeValues _budgetRange = const RangeValues(3000, 8000);
  final List<XFile> _photos = [];
  final ImagePicker _imagePicker = ImagePicker();

  // Categories data
  List<ServiceCategoryModel> _categories = [];
  bool _categoriesLoading = true;
  String? _categoriesError;
  bool _initialLoadStarted = false;

  // Preset problem chips per trade
  static const Map<String, List<String>> _commonProblems = {
    'plumb': [
      'Burst Pipe / Active Leak',
      'Clogged Drain / Toilet',
      'Tap / Faucet Replacement',
      'Low Water Pressure',
      'Water Tank Overflow',
      'Gully Sucker / Sump',
    ],
    'electr': [
      'Tripped Main Breaker',
      'Power Outage / Sparking',
      'Ceiling Fan Repair',
      'Switch / Socket Replacement',
      'Wiring Inspection',
      'Generator Fault',
    ],
    'ac': [
      'Not Cooling / Warm Air',
      'Water Leaking Inside',
      'Gas Leak / Refill',
      'Loud Compressor Noise',
      'Routine Filter Cleaning',
      'Remote / Thermostat Issue',
    ],
    'cool': [
      'Not Cooling / Warm Air',
      'Water Leaking Inside',
      'Gas Leak / Refill',
    ],
    'carp': [
      'Stuck / Swollen Door',
      'Lock / Latch Replacement',
      'Furniture Repair',
      'Custom Shelving',
      'Roof Truss Inspection',
    ],
    'paint': [
      'Interior Wall Painting',
      'Exterior Weatherproof Painting',
      'Waterproofing & Sealing',
      'Touch-up & Patch Painting',
    ],
    'mason': [
      'Cracked / Loose Floor Tiles',
      'Waterproofing Leak',
      'Plaster Cracks',
      'Brickwork Repair',
    ],
    'roof': [
      'Monsoon Leak Repair',
      'Clean Clogged Gutters',
      'Broken Tile / Sheet Replacement',
      'Waterproofing Membrane',
    ],
    'applian': [
      'Washing Machine Won\'t Spin',
      'Refrigerator Not Cooling',
      'Microwave Tripping',
      'Water Heater / Geyser Repair',
    ],
  };

  @override
  void initState() {
    super.initState();
    _serviceAddress = widget.initialAddress ?? '';
    _latitude = widget.initialLatitude;
    _longitude = widget.initialLongitude;
    _isLocationConfirmed = widget.initialLocationConfirmed;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialLoadStarted) {
      _initialLoadStarted = true;
      _loadCategories();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _descController.dispose();
    _landmarkController.dispose();
    super.dispose();
  }

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
        _applyCategoryBudgetDefaults(_selectedCategoryId);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _categoriesLoading = false;
        _categoriesError = 'Could not load service categories. $e';
      });
    }
  }

  String? _matchInitialCategory(List<ServiceCategoryModel> categories) {
    if (categories.isEmpty) return null;
    final initial = widget.initialCategory;
    if (initial == null) return categories.first.id;

    for (final c in categories) {
      if (c.name.toLowerCase() == initial.toLowerCase()) return c.id;
    }
    return categories.first.id;
  }

  void _applyCategoryBudgetDefaults(String? categoryId) {
    if (categoryId == null || _categories.isEmpty) return;
    final cat = _categories.firstWhere(
      (c) => c.id == categoryId,
      orElse: () => _categories.first,
    );
    final minBand = (cat.priceBandMin != null && cat.priceBandMin! > 0)
        ? cat.priceBandMin!
        : 2500.0;
    final maxBand = (cat.priceBandMax != null && cat.priceBandMax! >= minBand)
        ? cat.priceBandMax!
        : (minBand + 5500.0);
    setState(() {
      _budgetRange = RangeValues(minBand, maxBand);
    });
  }

  ServiceCategoryModel? get _currentCategory {
    if (_selectedCategoryId == null || _categories.isEmpty) return null;
    try {
      return _categories.firstWhere((c) => c.id == _selectedCategoryId);
    } catch (_) {
      return null;
    }
  }

  IconData _getCategoryIcon(String categoryName) {
    final name = categoryName.toLowerCase();
    if (name.contains('plumb')) return Icons.plumbing;
    if (name.contains('electr')) return Icons.electrical_services;
    if (name.contains('ac') || name.contains('air') || name.contains('cool')) return Icons.ac_unit;
    if (name.contains('carpenter') || name.contains('carpentry') || name.contains('wood')) return Icons.handyman;
    if (name.contains('paint')) return Icons.format_paint;
    if (name.contains('mason') || name.contains('tile')) return Icons.foundation;
    if (name.contains('roof')) return Icons.roofing;
    if (name.contains('applian') || name.contains('refriger')) return Icons.kitchen;
    if (name.contains('clean')) return Icons.cleaning_services;
    if (name.contains('garden') || name.contains('landscap')) return Icons.yard;
    return Icons.build;
  }

  List<String> _getProblemChipsForCategory(String? categoryName) {
    if (categoryName == null) return const [];
    final name = categoryName.toLowerCase();
    for (final entry in _commonProblems.entries) {
      if (name.contains(entry.key)) {
        return entry.value;
      }
    }
    return const [
      'Urgent Fix Needed',
      'Inspection / Diagnosis',
      'Replacement Required',
      'Maintenance / Servicing',
    ];
  }

  void _toggleProblemChip(String chip) {
    setState(() {
      if (_selectedChips.contains(chip)) {
        _selectedChips.remove(chip);
      } else {
        _selectedChips.add(chip);
      }

      // Prepend chips to description if description doesn't already contain them
      final currentDesc = _descController.text.trim();
      if (_selectedChips.isNotEmpty) {
        final prefix = '${_selectedChips.join(', ')}: ';
        // Check if there's already a prefix
        if (currentDesc.isEmpty) {
          _descController.text = prefix;
        } else if (!currentDesc.startsWith(prefix)) {
          // Check if current text contains any chip
          bool hasAny = false;
          for (final c in _selectedChips) {
            if (currentDesc.contains(c)) {
              hasAny = true;
              break;
            }
          }
          if (!hasAny) {
            _descController.text = '$prefix$currentDesc';
          }
        }
      }
    });
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

  Future<void> _openLocationPicker() async {
    final result = await Navigator.push<LocationResult>(
      context,
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          initialLatitude: _latitude,
          initialLongitude: _longitude,
          initialAddress: _serviceAddress.isNotEmpty ? _serviceAddress : null,
        ),
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _serviceAddress = result.address;
        _latitude = result.latitude;
        _longitude = result.longitude;
        _isLocationConfirmed = true;
      });
    }
  }

  bool _validateStep(int step) {
    if (step == 0) {
      if (_selectedCategoryId == null || _selectedCategoryId!.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a service category')),
        );
        return false;
      }
      if (_descController.text.trim().length < 10) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please describe the problem in at least 10 characters')),
        );
        return false;
      }
      return true;
    } else if (step == 1) {
      if (!_isLocationConfirmed || _serviceAddress.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please confirm your service location on the map')),
        );
        return false;
      }
      return true;
    } else if (step == 2) {
      if (_budgetRange.start > _budgetRange.end || _budgetRange.start <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter a valid budget range')),
        );
        return false;
      }
      return true;
    }
    return true;
  }

  void _nextStep() {
    if (!_validateStep(_currentStep)) return;
    if (_currentStep == 2) {
      final cat = _currentCategory;
      final double minBand = (cat?.priceBandMin != null && cat!.priceBandMin! > 0)
          ? cat.priceBandMin!
          : 2500.0;
      final double maxBand = (cat?.priceBandMax != null && cat!.priceBandMax! >= minBand)
          ? cat.priceBandMax!
          : (minBand + 5500.0);
      double sliderMin = (minBand * 0.7 / 500).floor() * 500.0;
      if (sliderMin < 1000.0) sliderMin = 1000.0;
      double sliderMax = (maxBand * 1.5 / 500).ceil() * 500.0;
      if (sliderMax <= sliderMin) sliderMax = sliderMin + 5000.0;
      final double start = _budgetRange.start.clamp(sliderMin, sliderMax);
      final double end = _budgetRange.end.clamp(start, sliderMax);
      _budgetRange = RangeValues(start, end);
    }
    if (_currentStep < 3) {
      setState(() => _currentStep++);
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeInOut,
      );
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeInOut,
      );
    } else {
      Navigator.of(context).pop();
    }
  }

  Future<void> _submitJob() async {
    final categoryId = _selectedCategoryId;
    if (categoryId == null || categoryId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a service category')),
      );
      return;
    }

    if (!_isLocationConfirmed || _serviceAddress.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please confirm your service location on the map')),
      );
      return;
    }

    final provider = context.read<JobRequestProvider>();

    // Build location payload with landmark and coordinates
    final landmark = _landmarkController.text.trim();
    String baseLocation = landmark.isNotEmpty
        ? '$_serviceAddress ($landmark)'
        : _serviceAddress;

    final coordSuffix = (_latitude != null && _longitude != null)
        ? ' [${_latitude!.toStringAsFixed(4)},${_longitude!.toStringAsFixed(4)}]'
        : '';

    const maxPayloadLength = 300;
    final maxBaseLength = maxPayloadLength - coordSuffix.length;
    if (baseLocation.length > maxBaseLength) {
      baseLocation = baseLocation.substring(0, maxBaseLength);
    }

    final locationPayload = '$baseLocation$coordSuffix';

    final description = _descController.text.trim();
    final clampedDesc = description.length > 2000 ? description.substring(0, 2000) : description;

    final request = await provider.submitInstantMatch(
      serviceCategoryId: categoryId,
      description: clampedDesc,
      location: locationPayload,
      urgency: _selectedUrgency,
      budgetMin: _budgetRange.start.roundToDouble(),
      budgetMax: _budgetRange.end.roundToDouble(),
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

    return PopScope(
      canPop: _currentStep == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _prevStep();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: const Text('Find an Instant Match'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: _prevStep,
          ),
        ),
        body: SafeArea(
          child: Column(
            children: [
              _buildProgressHeader(),
              Expanded(
                child: Form(
                  key: _formKey,
                  child: PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildStep0CategoryAndIssue(),
                      _buildStep1LocationAndLogistics(),
                      _buildStep2UrgencyAndBudget(),
                      _buildStep3ReviewAndDispatch(jobProvider),
                    ],
                  ),
                ),
              ),
              _buildBottomActionBar(jobProvider),
            ],
          ),
        ),
      ),
    );
  }

  // Segmented Progress Bar Header
  Widget _buildProgressHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: AppColors.borderLight),
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'STEP ${_currentStep + 1} OF 4',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                  letterSpacing: 0.8,
                ),
              ),
              Text(
                _stepTitles[_currentStep],
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: List.generate(4, (index) {
              final isCompletedOrCurrent = index <= _currentStep;
              return Expanded(
                child: Container(
                  height: 5,
                  margin: EdgeInsets.only(right: index < 3 ? 6 : 0),
                  decoration: BoxDecoration(
                    color: isCompletedOrCurrent ? AppColors.primary : AppColors.borderLight,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  // Step 0: Category & Issue Discovery
  Widget _buildStep0CategoryAndIssue() {
    final chips = _getProblemChipsForCategory(_currentCategory?.name);

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        // AI Info Banner
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.primaryUltraLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primaryLight.withOpacity(0.4)),
          ),
          child: const Row(
            children: [
              Icon(Icons.bolt, color: AppColors.primary, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'We check standard market rates and connect you with verified pros nearby.',
                  style: TextStyle(fontSize: 12, color: AppColors.primaryDark, height: 1.35),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),

        const Text(
          'Select Trade Category',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 4),
        const Text(
          'What do you need help with?',
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 12),

        if (_categoriesLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Column(
                children: [
                  SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(height: 10),
                  Text('Loading verified trade categories...', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                ],
              ),
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
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _categories.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.25,
            ),
            itemBuilder: (context, index) {
              final cat = _categories[index];
              final isSelected = cat.id == _selectedCategoryId;
              final icon = _getCategoryIcon(cat.name);

              return InkWell(
                onTap: () {
                  setState(() {
                    _selectedCategoryId = cat.id;
                    _selectedChips.clear();
                    _applyCategoryBudgetDefaults(cat.id);
                  });
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primaryUltraLight : AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : AppColors.border,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary.withOpacity(0.15)
                                  : Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              icon,
                              size: 20,
                              color: isSelected ? AppColors.primary : AppColors.textSecondary,
                            ),
                          ),
                          if (isSelected)
                            const Icon(Icons.check_circle, size: 18, color: AppColors.primary),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cat.name,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? AppColors.primaryDark : AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            cat.priceBandMin != null
                                ? 'From Rs. ${cat.priceBandMin!.toInt()}'
                                : 'Verified Pro',
                            style: TextStyle(
                              fontSize: 11,
                              color: isSelected ? AppColors.primary : AppColors.textMuted,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

        const SizedBox(height: 22),

        // Quick Problem Chips
        if (chips.isNotEmpty) ...[
          const Text(
            'Common Problems (Tap to add)',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: chips.map((chip) {
              final isSelected = _selectedChips.contains(chip);
              return FilterChip(
                label: Text(chip),
                selected: isSelected,
                labelStyle: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  color: isSelected ? AppColors.primaryDark : AppColors.textPrimary,
                ),
                backgroundColor: AppColors.surfaceElevated,
                selectedColor: AppColors.primaryLight.withOpacity(0.2),
                checkmarkColor: AppColors.primary,
                side: BorderSide(
                  color: isSelected ? AppColors.primary : AppColors.border,
                ),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                onSelected: (_) => _toggleProblemChip(chip),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
        ],

        // Issue Description Input
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Describe the Issue',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            Text(
              _descController.text.trim().length >= 10
                  ? '${_descController.text.trim().length} chars (looks good)'
                  : '${_descController.text.trim().length} / 10 chars min',
              style: TextStyle(
                fontSize: 11,
                color: _descController.text.trim().length >= 10 ? AppColors.success : AppColors.textMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: _descController,
          maxLines: 4,
          onChanged: (_) => setState(() {}),
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
      ],
    );
  }

  // Step 1: Map-Based Location & Logistics
  Widget _buildStep1LocationAndLogistics() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        const Text(
          'Service Location & Access',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 4),
        const Text(
          'Pin your address so we can match you with available tradespeople nearby.',
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 16),

        // Interactive Map Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primaryUltraLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.location_on, color: AppColors.primary, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Pinned Service Address',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _serviceAddress.isNotEmpty ? _serviceAddress : 'No address selected',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: _serviceAddress.isNotEmpty ? AppColors.textPrimary : AppColors.textMuted,
                          ),
                        ),
                        if (_latitude != null && _longitude != null) ...[
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: AppColors.borderLight),
                            ),
                            child: Text(
                              'GPS: ${_latitude!.toStringAsFixed(4)}° N, ${_longitude!.toStringAsFixed(4)}° E',
                              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontFamily: 'monospace'),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _openLocationPicker,
                  icon: const Icon(Icons.edit_location_alt_outlined, size: 18),
                  label: Text(_isLocationConfirmed ? 'Change Location on Google Maps' : 'Select Location on Google Maps'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Landmark / Gate Code details
        const Text(
          'Apartment, House No., or Landmark (Optional)',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: _landmarkController,
          decoration: const InputDecoration(
            hintText: 'e.g. No. 42, green gate opposite Keells Super, 2nd floor',
            prefixIcon: Icon(Icons.apartment_outlined, color: AppColors.textMuted),
          ),
        ),

        const SizedBox(height: 20),

        // Proximity guarantee banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: const Row(
            children: [
              Icon(Icons.near_me_outlined, color: AppColors.accent, size: 22),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'We match you with verified tradespeople within 3–5 km for fast arrival.',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.35),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Step 2: Urgency, Budget Bounds & Photos
  Widget _buildStep2UrgencyAndBudget() {
    final cat = _currentCategory;
    final double minBand = (cat?.priceBandMin != null && cat!.priceBandMin! > 0)
        ? cat.priceBandMin!
        : 2500.0;
    final double maxBand = (cat?.priceBandMax != null && cat!.priceBandMax! >= minBand)
        ? cat.priceBandMax!
        : (minBand + 5500.0);

    double sliderMin = (minBand * 0.7 / 500).floor() * 500.0;
    if (sliderMin < 1000.0) sliderMin = 1000.0;
    double sliderMax = (maxBand * 1.5 / 500).ceil() * 500.0;
    if (sliderMax <= sliderMin) sliderMax = sliderMin + 5000.0;

    final double start = _budgetRange.start.clamp(sliderMin, sliderMax);
    final double end = _budgetRange.end.clamp(start, sliderMax);
    final RangeValues safeRange = RangeValues(start, end);
    final int divisions = ((sliderMax - sliderMin) / 500).round().clamp(1, 100);

    final urgencies = [
      {
        'level': 'Emergency',
        'eta': '30 – 60 Min',
        'desc': 'Alerts available pros nearby right away for fastest response.',
        'color': AppColors.urgencyEmergency,
        'icon': Icons.bolt,
      },
      {
        'level': 'High',
        'eta': 'Within 2 – 4 Hours',
        'desc': 'High priority dispatch for same-day resolution.',
        'color': AppColors.urgencyHigh,
        'icon': Icons.alarm,
      },
      {
        'level': 'Medium',
        'eta': 'Today / Standard',
        'desc': 'Scheduled during daylight hours at verified standard rates.',
        'color': AppColors.urgencyMedium,
        'icon': Icons.calendar_today,
      },
      {
        'level': 'Low',
        'eta': 'Flexible / 24–48 Hours',
        'desc': 'Flexible timing for routine maintenance or non-urgent repairs.',
        'color': AppColors.urgencyLow,
        'icon': Icons.schedule,
      },
    ];

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        const Text(
          'Select Urgency Level',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 4),
        const Text(
          'Estimated arrival times depend on pro availability in your area.',
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 12),

        ...urgencies.map((u) {
          final level = u['level'] as String;
          final isSelected = _selectedUrgency == level;
          final color = u['color'] as Color;

          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: InkWell(
              onTap: () => setState(() => _selectedUrgency = level),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isSelected ? color.withOpacity(0.08) : AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? color : AppColors.border,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(u['icon'] as IconData, size: 20, color: color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                level,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? color : AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: color.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  u['eta'] as String,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: color,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            u['desc'] as String,
                            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    Radio<String>(
                      value: level,
                      groupValue: _selectedUrgency,
                      activeColor: color,
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedUrgency = val);
                      },
                    ),
                  ],
                ),
              ),
            ),
          );
        }),

        const SizedBox(height: 20),

        // Dynamic Budget Slider
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Estimated Budget (LKR / Rs.)',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            Text(
              'Rs. ${safeRange.start.toInt()} – Rs. ${safeRange.end.toInt()}',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        RangeSlider(
          values: safeRange,
          min: sliderMin,
          max: sliderMax,
          divisions: divisions,
          activeColor: AppColors.primary,
          inactiveColor: AppColors.border,
          onChanged: (values) {
            setState(() => _budgetRange = values);
          },
        ),

        // Market Feedback Badge
        _buildMarketFeedbackBadge(safeRange, minBand, maxBand),

        const SizedBox(height: 22),

        // Photo Attachments
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Attach Photos (Optional) (${_photos.length}/5)',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            if (_photos.length < 5)
              TextButton.icon(
                onPressed: _pickPhoto,
                icon: const Icon(Icons.add_a_photo_outlined, size: 16),
                label: const Text('Add Photo', style: TextStyle(fontSize: 12)),
              ),
          ],
        ),
        const SizedBox(height: 8),

        if (_photos.isNotEmpty) ...[
          SizedBox(
            height: 90,
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
                        width: 90,
                        height: 90,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: GestureDetector(
                        onTap: () => setState(() => _photos.removeAt(i)),
                        child: Container(
                          padding: const EdgeInsets.all(3),
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
          const SizedBox(height: 6),
          const Text(
            'Photos help the tradesperson bring the right tools and spare parts.',
            style: TextStyle(fontSize: 11, color: AppColors.textMuted),
          ),
        ] else
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.image_outlined, size: 20, color: AppColors.textMuted),
                const SizedBox(width: 8),
                const Text(
                  'No photos attached yet.',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                TextButton(
                  onPressed: _pickPhoto,
                  child: const Text('Add Photo', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildMarketFeedbackBadge(RangeValues budget, double minBand, double maxBand) {
    if (budget.end < minBand) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.warningLight,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.warning.withOpacity(0.5)),
        ),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.warning),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Below typical market rate (Rs. ${minBand.toInt()}+). Pros may take longer to accept.',
                style: const TextStyle(fontSize: 11, color: AppColors.textPrimary),
              ),
            ),
          ],
        ),
      );
    } else if (budget.start > maxBand) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.infoLight,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.info.withOpacity(0.5)),
        ),
        child: const Row(
          children: [
            Icon(Icons.star_outline, size: 16, color: AppColors.info),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Premium budget — prioritized for top-rated 5-star master craftsmen.',
                style: TextStyle(fontSize: 11, color: AppColors.primaryDark),
              ),
            ),
          ],
        ),
      );
    } else {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.successLight,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.success.withOpacity(0.5)),
        ),
        child: Row(
          children: [
            const Icon(Icons.check_circle_outline, size: 16, color: AppColors.success),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Within verified market rate for Colombo (Rs. ${minBand.toInt()} – Rs. ${maxBand.toInt()}).',
                style: const TextStyle(fontSize: 11, color: AppColors.textPrimary),
              ),
            ),
          ],
        ),
      );
    }
  }

  // Step 3: Review & Confirmation Gate
  Widget _buildStep3ReviewAndDispatch(JobRequestProvider jobProvider) {
    final cat = _currentCategory;
    final catName = cat?.name ?? 'General Handyman';
    final landmark = _landmarkController.text.trim();

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        const Text(
          'Review Your Request',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 4),
        const Text(
          'Please verify your request details before connecting with a pro.',
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 16),

        // Summary Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
            boxShadow: const [
              BoxShadow(
                color: AppColors.cardShadow,
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Trade Category Row
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primaryUltraLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(_getCategoryIcon(catName), size: 22, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'SERVICE CATEGORY',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted, letterSpacing: 0.5),
                        ),
                        Text(
                          catName,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getUrgencyColor(_selectedUrgency).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _selectedUrgency.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: _getUrgencyColor(_selectedUrgency),
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),

              // Location Row
              _buildReviewRow(
                icon: Icons.location_on_outlined,
                title: 'Service Address',
                value: landmark.isNotEmpty
                    ? '$_serviceAddress\nNote: $landmark'
                    : (_serviceAddress.isNotEmpty ? _serviceAddress : 'No address selected'),
              ),
              const SizedBox(height: 14),

              // Budget Row
              _buildReviewRow(
                icon: Icons.payments_outlined,
                title: 'Estimated Budget',
                value: 'Rs. ${_budgetRange.start.toInt()} – Rs. ${_budgetRange.end.toInt()}',
              ),
              const SizedBox(height: 14),

              // Photos Row
              _buildReviewRow(
                icon: Icons.photo_library_outlined,
                title: 'Photos Attached',
                value: _photos.isNotEmpty ? '${_photos.length} photo(s)' : 'None attached',
              ),
              const SizedBox(height: 14),

              // Description Row
              _buildReviewRow(
                icon: Icons.description_outlined,
                title: 'Issue Scope',
                value: _descController.text.trim(),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // What happens next notice
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.primaryUltraLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primaryLight.withOpacity(0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.auto_awesome, color: AppColors.primary, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'What happens after you confirm:',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primaryDark),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _buildStepPoint('Checks rates against typical prices for your area.'),
              _buildStepPoint('Alerts verified pros closest to your location.'),
              _buildStepPoint('Nearby pros have 90 seconds to accept your job.'),
              _buildStepPoint('You can track pro response live on your screen.'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildReviewRow({required IconData icon, required String title, required String value}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.textMuted),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStepPoint(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 11.5, color: AppColors.textSecondary, height: 1.3),
            ),
          ),
        ],
      ),
    );
  }

  Color _getUrgencyColor(String urgency) {
    switch (urgency) {
      case 'Emergency':
        return AppColors.urgencyEmergency;
      case 'High':
        return AppColors.urgencyHigh;
      case 'Medium':
        return AppColors.urgencyMedium;
      default:
        return AppColors.urgencyLow;
    }
  }

  // Persistent Bottom Action Bar
  Widget _buildBottomActionBar(JobRequestProvider jobProvider) {
    final isLastStep = _currentStep == 3;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: AppColors.borderLight),
        ),
      ),
      child: Row(
        children: [
          if (_currentStep > 0) ...[
            Expanded(
              flex: 1,
              child: OutlinedButton(
                onPressed: jobProvider.isSubmitting ? null : _prevStep,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textSecondary,
                  side: const BorderSide(color: AppColors.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Back', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            flex: 2,
            child: isLastStep
                ? CustomButton(
                    text: 'Confirm & Dispatch Pro',
                    icon: Icons.flash_on,
                    isLoading: jobProvider.isSubmitting,
                    onPressed: _submitJob,
                  )
                : CustomButton(
                    text: 'Continue',
                    icon: Icons.arrow_forward,
                    onPressed: _nextStep,
                  ),
          ),
        ],
      ),
    );
  }
}
