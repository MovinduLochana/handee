class ProviderAvailabilitySlotModel {
  final String id;
  final String providerId;
  final DateTime startTime;
  final DateTime endTime;
  final bool isBooked;
  final DateTime createdAt;
  final DateTime? updatedAt;

  ProviderAvailabilitySlotModel({
    required this.id,
    required this.providerId,
    required this.startTime,
    required this.endTime,
    required this.isBooked,
    required this.createdAt,
    this.updatedAt,
  });

  factory ProviderAvailabilitySlotModel.fromJson(Map<String, dynamic> json) {
    return ProviderAvailabilitySlotModel(
      id: json['id']?.toString() ?? '',
      providerId: json['providerId']?.toString() ?? '',
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: DateTime.parse(json['endTime'] as String),
      isBooked: json['isBooked'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'providerId': providerId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'isBooked': isBooked,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}
