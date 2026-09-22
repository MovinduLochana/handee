import 'provider_profile_model.dart';

class JobRequestModel {
  final String id;
  final String category;
  final String description;
  final List<String> photoUrls;
  final String location;
  final String urgency; // "Low", "Medium", "High", "Emergency"
  final double? budgetMin;
  final double? budgetMax;
  final String status; // "pending_ai_review", "pending_approval", "approved_for_auto_dispatch", "dispatched", "completed"
  final String customerId;
  final String? customerName;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final ProviderProfileModel? assignedProvider;
  final double? estimatedPrice;

  JobRequestModel({
    required this.id,
    required this.category,
    required this.description,
    this.photoUrls = const [],
    required this.location,
    required this.urgency,
    this.budgetMin,
    this.budgetMax,
    required this.status,
    required this.customerId,
    this.customerName,
    required this.createdAt,
    this.updatedAt,
    this.assignedProvider,
    this.estimatedPrice,
  });

  bool get isPendingReview => status == 'pending_ai_review' || status == 'pending_approval';
  bool get isDispatched => status == 'dispatched' || status == 'approved_for_auto_dispatch';

  factory JobRequestModel.fromJson(Map<String, dynamic> json) {
    return JobRequestModel(
      id: json['id']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      description: json['description']?.toString() ?? '',
      photoUrls: (json['photoUrls'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      location: json['location']?.toString() ?? 'Colombo',
      urgency: json['urgency']?.toString() ?? 'Medium',
      budgetMin: (json['budgetMin'] as num?)?.toDouble(),
      budgetMax: (json['budgetMax'] as num?)?.toDouble(),
      status: json['status']?.toString() ?? 'pending_ai_review',
      customerId: json['customerId']?.toString() ?? '',
      customerName: json['customerName']?.toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString())
          : null,
      assignedProvider: json['assignedProvider'] != null
          ? ProviderProfileModel.fromJson(json['assignedProvider'] as Map<String, dynamic>)
          : null,
      estimatedPrice: (json['estimatedPrice'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'category': category,
      'description': description,
      'photoUrls': photoUrls,
      'location': location,
      'urgency': urgency,
      'budgetMin': budgetMin,
      'budgetMax': budgetMax,
      'status': status,
      'customerId': customerId,
      'customerName': customerName,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'estimatedPrice': estimatedPrice,
    };
  }

  JobRequestModel copyWith({
    String? id,
    String? category,
    String? description,
    List<String>? photoUrls,
    String? location,
    String? urgency,
    double? budgetMin,
    double? budgetMax,
    String? status,
    String? customerId,
    String? customerName,
    DateTime? createdAt,
    DateTime? updatedAt,
    ProviderProfileModel? assignedProvider,
    double? estimatedPrice,
  }) {
    return JobRequestModel(
      id: id ?? this.id,
      category: category ?? this.category,
      description: description ?? this.description,
      photoUrls: photoUrls ?? this.photoUrls,
      location: location ?? this.location,
      urgency: urgency ?? this.urgency,
      budgetMin: budgetMin ?? this.budgetMin,
      budgetMax: budgetMax ?? this.budgetMax,
      status: status ?? this.status,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      assignedProvider: assignedProvider ?? this.assignedProvider,
      estimatedPrice: estimatedPrice ?? this.estimatedPrice,
    );
  }
}
