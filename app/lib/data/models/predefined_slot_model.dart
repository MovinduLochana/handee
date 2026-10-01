class PredefinedSlotModel {
  final String slotKey;
  final String displayLabel;
  final DateTime startTime;
  final DateTime endTime;
  final bool isAvailable;
  final String? unavailableReason;

  PredefinedSlotModel({
    required this.slotKey,
    required this.displayLabel,
    required this.startTime,
    required this.endTime,
    required this.isAvailable,
    this.unavailableReason,
  });

  factory PredefinedSlotModel.fromJson(Map<String, dynamic> json) {
    return PredefinedSlotModel(
      slotKey: json['slotKey']?.toString() ?? '',
      displayLabel: json['displayLabel']?.toString() ?? '',
      startTime: DateTime.parse(json['startTime'].toString()),
      endTime: DateTime.parse(json['endTime'].toString()),
      isAvailable: json['isAvailable'] as bool? ?? false,
      unavailableReason: json['unavailableReason']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'slotKey': slotKey,
      'displayLabel': displayLabel,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'isAvailable': isAvailable,
      'unavailableReason': unavailableReason,
    };
  }
}

class DailySlotsModel {
  final String providerId;
  final DateTime date;
  final int durationHours;
  final bool isWorkingDay;
  final List<PredefinedSlotModel> slots;

  DailySlotsModel({
    required this.providerId,
    required this.date,
    required this.durationHours,
    required this.isWorkingDay,
    required this.slots,
  });

  factory DailySlotsModel.fromJson(Map<String, dynamic> json) {
    final rawSlots = json['slots'] as List? ?? [];
    return DailySlotsModel(
      providerId: json['providerId']?.toString() ?? '',
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      durationHours: (json['durationHours'] as num?)?.toInt() ?? 1,
      isWorkingDay: json['isWorkingDay'] as bool? ?? false,
      slots: rawSlots
          .map((s) => PredefinedSlotModel.fromJson(s as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'providerId': providerId,
      'date': date.toIso8601String(),
      'durationHours': durationHours,
      'isWorkingDay': isWorkingDay,
      'slots': slots.map((s) => s.toJson()).toList(),
    };
  }
}
