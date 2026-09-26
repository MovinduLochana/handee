import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/constants/colors.dart';
import '../core/network/api_client.dart';
import '../data/models/provider_availability_slot_model.dart';
import '../data/repositories/provider_availability_repository.dart';

class ProviderAvailabilitySlotPicker extends StatefulWidget {
  final String providerId;
  final DateTime? selectedSlotTime;
  final ValueChanged<DateTime> onSlotSelected;
  final ProviderAvailabilityRepository? repository;

  const ProviderAvailabilitySlotPicker({
    super.key,
    required this.providerId,
    required this.onSlotSelected,
    this.selectedSlotTime,
    this.repository,
  });

  @override
  State<ProviderAvailabilitySlotPicker> createState() => _ProviderAvailabilitySlotPickerState();
}

class _ProviderAvailabilitySlotPickerState extends State<ProviderAvailabilitySlotPicker> {
  late ProviderAvailabilityRepository _repository;
  bool _isLoading = true;
  String? _errorMessage;
  List<ProviderAvailabilitySlotModel> _slots = [];
  DateTime? _activeDay;

  @override
  void initState() {
    super.initState();
    _initAndFetch();
  }

  void _initAndFetch() {
    if (widget.repository != null) {
      _repository = widget.repository!;
      _loadSlots();
      return;
    }

    try {
      final apiClient = Provider.of<ApiClient>(context, listen: false);
      _repository = ProviderAvailabilityRepository(apiClient: apiClient);
      _loadSlots();
    } catch (_) {
      setState(() {
        _isLoading = false;
        _slots = [];
      });
    }
  }

  Future<void> _loadSlots() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final now = DateTime.now();
      final slots = await _repository.getForProvider(
        widget.providerId,
        startDate: now,
        endDate: now.add(const Duration(days: 14)),
      );

      if (mounted) {
        setState(() {
          _slots = slots;
          _isLoading = false;
          if (slots.isNotEmpty) {
            final firstDate = slots.first.startTime;
            _activeDay = DateTime(firstDate.year, firstDate.month, firstDate.day);
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Could not load slots';
        });
      }
    }
  }

  Map<DateTime, List<ProviderAvailabilitySlotModel>> _groupSlotsByDay() {
    final Map<DateTime, List<ProviderAvailabilitySlotModel>> grouped = {};
    for (final slot in _slots) {
      final dayKey = DateTime(slot.startTime.year, slot.startTime.month, slot.startTime.day);
      grouped.putIfAbsent(dayKey, () => []).add(slot);
    }
    return grouped;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Center(
          child: SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    if (_errorMessage != null || _slots.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.blue.withOpacity(0.06),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.blue.withOpacity(0.15)),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline, size: 18, color: AppColors.primary),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'Flexible scheduling: Select your preferred date and time below.',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ),
          ],
        ),
      );
    }

    final grouped = _groupSlotsByDay();
    final days = grouped.keys.toList()..sort();
    final activeSlots = _activeDay != null ? (grouped[_activeDay] ?? []) : <ProviderAvailabilitySlotModel>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Available Working Slots',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.textSecondary,
              ),
            ),
            InkWell(
              onTap: _loadSlots,
              child: const Text(
                'Refresh',
                style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Day Selector Tabs
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: days.map((day) {
              final isSelected = _activeDay == day;
              final dayStr = DateFormat('EEE, MMM d').format(day);
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(
                    dayStr,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.background,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _activeDay = day;
                      });
                    }
                  },
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 10),

        // Time Slots Chips for Active Day
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: activeSlots.map((slot) {
            final isSelected = widget.selectedSlotTime != null &&
                widget.selectedSlotTime!.year == slot.startTime.year &&
                widget.selectedSlotTime!.month == slot.startTime.month &&
                widget.selectedSlotTime!.day == slot.startTime.day &&
                widget.selectedSlotTime!.hour == slot.startTime.hour &&
                widget.selectedSlotTime!.minute == slot.startTime.minute;

            final timeLabel = DateFormat('hh:mm a').format(slot.startTime);

            return InkWell(
              onTap: () => widget.onSlotSelected(slot.startTime),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.borderLight,
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isSelected ? Icons.check_circle : Icons.access_time,
                      size: 14,
                      color: isSelected ? Colors.white : AppColors.primary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      timeLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isSelected ? Colors.white : AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
