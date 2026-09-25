/// Mirrors the backend `JobRequestResponseDto` exactly.
///
/// Response property casing is camelCase: ASP.NET Core's default
/// `JsonNamingPolicy.CamelCase` applies, because Program.cs registers only a
/// `JsonStringEnumConverter` and never sets a `PropertyNamingPolicy`.
class JobRequestModel {
  final String id;

  /// FK to ServiceCategory. Sent on create, returned on read.
  final String serviceCategoryId;

  /// Human-readable category name, resolved server-side. Display this, never
  /// the raw `serviceCategoryId`.
  final String categoryName;

  final String description;
  final List<String> photoUrls;
  final String location;

  /// "Low" | "Medium" | "High" | "Emergency" (JobUrgency enum, serialized as
  /// a string by JsonStringEnumConverter).
  final String urgency;

  final double? budgetMin;
  final double? budgetMax;

  /// "PendingAiReview" | "Open" | "Cancelled" — the complete JobRequestStatus
  /// enum. There are no other values.
  final String status;

  final String customerId;
  final DateTime createdAt;
  final DateTime? updatedAt;

  JobRequestModel({
    required this.id,
    required this.serviceCategoryId,
    required this.categoryName,
    required this.description,
    this.photoUrls = const [],
    required this.location,
    required this.urgency,
    this.budgetMin,
    this.budgetMax,
    required this.status,
    required this.customerId,
    required this.createdAt,
    this.updatedAt,
  });

  bool get isPendingAiReview => status.toLowerCase() == 'pendingaireview';
  bool get isOpen => status.toLowerCase() == 'open';
  bool get isCancelled => status.toLowerCase() == 'cancelled';

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'pendingaireview':
        return 'Pending AI Review';
      case 'open':
        return 'Open';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  factory JobRequestModel.fromJson(Map<String, dynamic> json) {
    return JobRequestModel(
      id: json['id']?.toString() ?? '',
      serviceCategoryId: json['serviceCategoryId']?.toString() ?? '',
      categoryName: json['categoryName']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      photoUrls: (json['photoUrls'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      location: json['location']?.toString() ?? '',
      urgency: json['urgency']?.toString() ?? 'Medium',
      budgetMin: (json['budgetMin'] as num?)?.toDouble(),
      budgetMax: (json['budgetMax'] as num?)?.toDouble(),
      status: json['status']?.toString() ?? 'PendingAiReview',
      customerId: json['customerId']?.toString() ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'serviceCategoryId': serviceCategoryId,
      'categoryName': categoryName,
      'description': description,
      'photoUrls': photoUrls,
      'location': location,
      'urgency': urgency,
      'budgetMin': budgetMin,
      'budgetMax': budgetMax,
      'status': status,
      'customerId': customerId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  JobRequestModel copyWith({
    String? id,
    String? serviceCategoryId,
    String? categoryName,
    String? description,
    List<String>? photoUrls,
    String? location,
    String? urgency,
    double? budgetMin,
    double? budgetMax,
    String? status,
    String? customerId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return JobRequestModel(
      id: id ?? this.id,
      serviceCategoryId: serviceCategoryId ?? this.serviceCategoryId,
      categoryName: categoryName ?? this.categoryName,
      description: description ?? this.description,
      photoUrls: photoUrls ?? this.photoUrls,
      location: location ?? this.location,
      urgency: urgency ?? this.urgency,
      budgetMin: budgetMin ?? this.budgetMin,
      budgetMax: budgetMax ?? this.budgetMax,
      status: status ?? this.status,
      customerId: customerId ?? this.customerId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
