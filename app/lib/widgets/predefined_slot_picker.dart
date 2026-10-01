import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/constants/colors.dart';
import '../core/network/api_client.dart';
import '../data/models/predefined_slot_model.dart';
import '../data/repositories/provider_availability_repository.dart';
import '../providers/booking_provider.dart';

enum DayPart { morning, afternoon, evening }

class PredefinedSlotPicker extends StatefulWidget {
  final String providerId;
  final int durationHours;
  final PredefinedSlotModel? selectedSlot;
  final ValueChanged<PredefinedSlotModel> onSlotSelected;
  final ProviderAvailabilityRepository? repository;
  final DateTime? initialDate;

  const PredefinedSlotPicker({
    super.key,
    required this.providerId,
    this.durationHours = 1,
    this.selectedSlot,
    required this.onSlotSelected,
    this.repository,
    this.initialDate,
  });

  @override
  State<PredefinedSlotPicker> createState() => _PredefinedSlotPickerState();
}

class _PredefinedSlotPickerState extends State<PredefinedSlotPicker> {
  late ProviderAvailabilityRepository _repository;
  late DateTime _selectedDate;
  late List<DateTime> _dateStrip;
  bool _isLoading = true;
  String? _errorMessage;
  DailySlotsModel? _dailySlots;
  PredefinedSlotModel? _currentSlot;
  DayPart _activeDayPart = DayPart.morning;

  @override
  void initState() {
    super.initState();
    _currentSlot = widget.selectedSlot;

    // Generate 14 days starting from today or initialDate
    final now = widget.initialDate ?? DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
    _dateStrip = List.generate(14, (i) {
      final d = now.add(Duration(days: i));
      return DateTime(d.year, d.month, d.day);
    });

    _initAndFetch();
  }

  @override
  void didUpdateWidget(covariant PredefinedSlotPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedSlot != oldWidget.selectedSlot) {
      setState(() {
        _currentSlot = widget.selectedSlot;
      });
    }
  }

  void _initAndFetch() {
    if (widget.repository != null) {
      _repository = widget.repository!;
      _loadSlotsForDate(_selectedDate);
      return;
    }

    try {
      // 1. Check if ProviderAvailabilityRepository is provided directly
      try {
        _repository = Provider.of<ProviderAvailabilityRepository>(context, listen: false);
        _loadSlotsForDate(_selectedDate);
        return;
      } catch (_) {}

      // 2. Check if ApiClient is provided directly
      try {
        final apiClient = Provider.of<ApiClient>(context, listen: false);
        _repository = ProviderAvailabilityRepository(apiClient: apiClient);
        _loadSlotsForDate(_selectedDate);
        return;
      } catch (_) {}

      // 3. Fallback: check if BookingProvider exists in tree and extract its ApiClient
      try {
        final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
        final client = bookingProvider.repository.apiClient;
        _repository = ProviderAvailabilityRepository(apiClient: client);
        _loadSlotsForDate(_selectedDate);
        return;
      } catch (_) {}

      // Safe fallback for offline or unit test environments without providers
      _repository = ProviderAvailabilityRepository();
      _loadSlotsForDate(_selectedDate);
    } catch (e) {
      debugPrint('PredefinedSlotPicker error initializing repository: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Unable to connect to availability service.';
        });
      }
    }
  }

  Future<void> _loadSlotsForDate(DateTime date) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await _repository.getPredefinedSlots(
        providerId: widget.providerId,
        date: date,
        durationHours: widget.durationHours,
      );

      if (mounted) {
        setState(() {
          _dailySlots = result;
          _isLoading = false;
          _autoSelectDayPart();
        });
      }
    } catch (e) {
      debugPrint('Error loading slots for date: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Could not load availability slots. Please try again.';
        });
      }
    }
  }

  void _autoSelectDayPart() {
    if (_dailySlots == null || _dailySlots!.slots.isEmpty) return;

    // Keep current if it has available slots
    final currentSlots = _getSlotsForDayPart(_activeDayPart);
    if (currentSlots.any((s) => s.isAvailable)) return;

    // Otherwise switch to first period with available slots
    if (_morningSlots.any((s) => s.isAvailable)) {
      _activeDayPart = DayPart.morning;
    } else if (_afternoonSlots.any((s) => s.isAvailable)) {
      _activeDayPart = DayPart.afternoon;
    } else if (_eveningSlots.any((s) => s.isAvailable)) {
      _activeDayPart = DayPart.evening;
    } else if (_morningSlots.isNotEmpty) {
      _activeDayPart = DayPart.morning;
    } else if (_afternoonSlots.isNotEmpty) {
      _activeDayPart = DayPart.afternoon;
    } else if (_eveningSlots.isNotEmpty) {
      _activeDayPart = DayPart.evening;
    }
  }

  List<PredefinedSlotModel> get _morningSlots =>
      _dailySlots?.slots.where((s) => s.startTime.hour < 12).toList() ?? [];

  List<PredefinedSlotModel> get _afternoonSlots =>
      _dailySlots?.slots.where((s) => s.startTime.hour >= 12 && s.startTime.hour < 17).toList() ?? [];

  List<PredefinedSlotModel> get _eveningSlots =>
      _dailySlots?.slots.where((s) => s.startTime.hour >= 17).toList() ?? [];

  List<PredefinedSlotModel> _getSlotsForDayPart(DayPart part) {
    switch (part) {
      case DayPart.morning:
        return _morningSlots;
      case DayPart.afternoon:
        return _afternoonSlots;
      case DayPart.evening:
        return _eveningSlots;
    }
  }

  void _selectDate(DateTime date) {
    if (_selectedDate == date) return;
    setState(() {
      _selectedDate = date;
      _currentSlot = null;
    });
    _loadSlotsForDate(date);
  }

  String _formatReason(String? reason) {
    switch (reason) {
      case 'Booked':
        return 'Booked';
      case 'Past':
        return 'Passed';
      case 'InsufficientTime':
        return 'Short';
      case 'OutsideHours':
        return 'Closed';
      default:
        return 'Busy';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Date Header & Month
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Select Date',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            Text(
              DateFormat('MMMM yyyy').format(_selectedDate),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Refined 54px Calendar Strip
        SizedBox(
          height: 54,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _dateStrip.length,
            separatorBuilder: (_, _) => const SizedBox(width: 6),
            itemBuilder: (context, index) {
              final date = _dateStrip[index];
              final isSelected = _selectedDate.year == date.year &&
                  _selectedDate.month == date.month &&
                  _selectedDate.day == date.day;
              final isToday = DateTime.now().year == date.year &&
                  DateTime.now().month == date.month &&
                  DateTime.now().day == date.day;

              return InkWell(
                onTap: () => _selectDate(date),
                borderRadius: BorderRadius.circular(10),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 140),
                  width: 50,
                  padding: const EdgeInsets.symmetric(vertical: 5),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : const Color(0xFFE2E8F0),
                      width: 1.0,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isToday ? 'TODAY' : DateFormat('EEE').format(date).toUpperCase(),
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? Colors.white.withOpacity(0.85)
                              : (isToday ? AppColors.primary : AppColors.textMuted),
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        '${date.day}',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isSelected ? Colors.white : AppColors.textPrimary,
                          height: 1.1,
                        ),
                      ),
                      Text(
                        DateFormat('MMM').format(date),
                        style: TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.w500,
                          color: isSelected ? Colors.white.withOpacity(0.8) : AppColors.textMuted,
                          height: 1.0,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),

        // Section Title with Refresh
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              widget.durationHours > 1
                  ? 'Time Slots (${widget.durationHours} Hours)'
                  : 'Time Slots (1 Hour)',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            if (!_isLoading)
              InkWell(
                onTap: () => _loadSlotsForDate(_selectedDate),
                child: const Row(
                  children: [
                    Icon(Icons.refresh_rounded, size: 14, color: AppColors.textMuted),
                    SizedBox(width: 4),
                    Text(
                      'Refresh',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),

        // Content Area
        if (_isLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(strokeWidth: 2.0),
              ),
            ),
          )
        else if (_errorMessage != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.errorLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, size: 16, color: AppColors.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(fontSize: 12, color: AppColors.error),
                  ),
                ),
                TextButton(
                  onPressed: () => _initAndFetch(),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: const Size(48, 28),
                  ),
                  child: const Text(
                    'Retry',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          )
        else if (_dailySlots == null || !_dailySlots!.isWorkingDay || _dailySlots!.slots.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              children: [
                Icon(Icons.event_busy, color: Colors.amber.shade700, size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Provider is closed on this day. Please select another date.',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Colors.amber.shade900,
                    ),
                  ),
                ),
              ],
            ),
          )
        else ...[
          // 2. Daypart Segmentation Tabs (Morning / Afternoon / Evening)
          _buildDayPartTabs(),
          const SizedBox(height: 8),

          // 3. Compact 3-Column Slot Grid
          _buildSlotsGrid(),
        ],

        // 4. Refined Visual Reservation Window Banner
        if (_currentSlot != null) ...[
          _buildConnectedWindowBanner(),
        ],
      ],
    );
  }

  Widget _buildDayPartTabs() {
    final morningOpen = _morningSlots.where((s) => s.isAvailable).length;
    final afternoonOpen = _afternoonSlots.where((s) => s.isAvailable).length;
    final eveningOpen = _eveningSlots.where((s) => s.isAvailable).length;

    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          _buildTabButton(
            title: 'Morning',
            count: morningOpen,
            isSelected: _activeDayPart == DayPart.morning,
            onTap: () => setState(() => _activeDayPart = DayPart.morning),
          ),
          _buildTabButton(
            title: 'Afternoon',
            count: afternoonOpen,
            isSelected: _activeDayPart == DayPart.afternoon,
            onTap: () => setState(() => _activeDayPart = DayPart.afternoon),
          ),
          _buildTabButton(
            title: 'Evening',
            count: eveningOpen,
            isSelected: _activeDayPart == DayPart.evening,
            onTap: () => setState(() => _activeDayPart = DayPart.evening),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton({
    required String title,
    required int count,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 140),
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            border: isSelected
                ? Border.all(color: const Color(0xFFE2E8F0), width: 1.0)
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  color: isSelected ? AppColors.textPrimary : AppColors.textSecondary,
                ),
              ),
              if (count > 0) ...[
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primaryUltraLight : const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? AppColors.primary : AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSlotsGrid() {
    final slots = _getSlotsForDayPart(_activeDayPart);

    if (slots.isEmpty) {
      final periodName = _activeDayPart == DayPart.morning
          ? 'morning'
          : (_activeDayPart == DayPart.afternoon ? 'afternoon' : 'evening');
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Center(
          child: Text(
            'No slots scheduled for the $periodName.',
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: slots.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1.85,
      ),
      itemBuilder: (context, index) {
        final slot = slots[index];
        final isSelected = _currentSlot != null && _currentSlot!.startTime == slot.startTime;
        final isAvailable = slot.isAvailable;
        final startStr = DateFormat('hh:mm a').format(slot.startTime);
        final endStr = DateFormat('hh:mm a').format(slot.endTime);

        return Semantics(
          label: slot.displayLabel,
          selected: isSelected,
          child: InkWell(
            onTap: isAvailable
                ? () {
                    setState(() {
                      _currentSlot = slot;
                    });
                    widget.onSlotSelected(slot);
                  }
                : null,
            borderRadius: BorderRadius.circular(8),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 140),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primaryUltraLight
                    : (isAvailable ? Colors.white : const Color(0xFFF8FAFC)),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isSelected
                      ? AppColors.primary
                      : (isAvailable ? const Color(0xFFE2E8F0) : const Color(0xFFEDEFEF)),
                  width: isSelected ? 1.4 : 1.0,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    startStr,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                      color: isSelected
                          ? AppColors.primaryDark
                          : (isAvailable ? AppColors.textPrimary : const Color(0xFF94A3B8)),
                    ),
                  ),
                  const SizedBox(height: 2),
                  if (isAvailable)
                    Text(
                      widget.durationHours > 1 ? '→ $endStr' : '1 hr',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w500,
                        color: isSelected ? AppColors.primary : AppColors.textMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    )
                  else
                    Text(
                      _formatReason(slot.unavailableReason),
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF94A3B8),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildConnectedWindowBanner() {
    final startStr = DateFormat('hh:mm a').format(_currentSlot!.startTime);
    final endStr = DateFormat('hh:mm a').format(_currentSlot!.endTime);

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.check_circle_outline, color: AppColors.primary, size: 14),
                  SizedBox(width: 5),
                  Text(
                    'Selected Window',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              Text(
                widget.durationHours > 1
                    ? '${widget.durationHours} Consecutive Slots Reserved'
                    : '1 Slot Reserved',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                // Start
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'START',
                      style: TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textMuted,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      startStr,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                // Timeline Connector
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Column(
                      children: [
                        Text(
                          '${widget.durationHours} hr${widget.durationHours > 1 ? 's' : ''}',
                          style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              width: 5,
                              height: 5,
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            Expanded(
                              child: Container(
                                height: 1.5,
                                color: const Color(0xFFCBD5E1),
                              ),
                            ),
                            const Icon(
                              Icons.arrow_right_rounded,
                              size: 14,
                              color: AppColors.primary,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                // End
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'END',
                      style: TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textMuted,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      endStr,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
