import 'job_request_model.dart';
import 'provider_profile_model.dart';

class BookingModel {
  final String id;
  final String? jobRequestId;
  final String? serviceListingId;
  final String providerId;
  final String customerId;
  final String status; // "Requested", "Accepted", "InProgress", "Completed", "Disputed"
  final DateTime? scheduledAt;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final JobRequestModel? jobRequest;
  final ProviderProfileModel? provider;
  final String? customerName;
  final String? customerPhone;
  final String? serviceLocation;
  final double? price;

  /// Flat fields on BookingResponseDto, resolved server-side from the linked
  /// JobRequest. The nested [jobRequest] object is never sent by the backend,
  /// so read category/description from these.
  final String? category;
  final String? description;
  final String? notes;

  BookingModel({
    required this.id,
    this.jobRequestId,
    this.serviceListingId,
    required this.providerId,
    required this.customerId,
    required this.status,
    this.scheduledAt,
    required this.createdAt,
    this.updatedAt,
    this.jobRequest,
    this.provider,
    this.customerName,
    this.customerPhone,
    this.serviceLocation,
    this.price,
    this.category,
    this.description,
    this.notes,
  });

  bool get isRequested => status.toLowerCase() == 'requested';
  bool get isAccepted => status.toLowerCase() == 'accepted';
  bool get isInProgress => status.toLowerCase() == 'inprogress' || status.toLowerCase() == 'in_progress';
  bool get isCompleted => status.toLowerCase() == 'completed';
  bool get isDisputed => status.toLowerCase() == 'disputed';

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'requested':
        return 'Pending Provider';
      case 'accepted':
        return 'Confirmed';
      case 'inprogress':
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'disputed':
        return 'Disputed';
      default:
        return status;
    }
  }

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id']?.toString() ?? '',
      jobRequestId: json['jobRequestId']?.toString(),
      serviceListingId: json['serviceListingId']?.toString(),
      providerId: json['providerId']?.toString() ?? '',
      customerId: json['customerId']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Requested',
      scheduledAt: json['scheduledAt'] != null
          ? DateTime.tryParse(json['scheduledAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString())
          : null,
      jobRequest: json['jobRequest'] != null
          ? JobRequestModel.fromJson(json['jobRequest'] as Map<String, dynamic>)
          : null,
      provider: json['provider'] != null
          ? ProviderProfileModel.fromJson(json['provider'] as Map<String, dynamic>)
          : null,
      customerName: json['customerName']?.toString(),
      customerPhone: json['customerPhone']?.toString(),
      serviceLocation: json['serviceLocation']?.toString(),
      price: (json['price'] as num?)?.toDouble(),
      category: json['category']?.toString(),
      description: json['description']?.toString(),
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'jobRequestId': jobRequestId,
      'serviceListingId': serviceListingId,
      'providerId': providerId,
      'customerId': customerId,
      'status': status,
      'scheduledAt': scheduledAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'price': price,
      'notes': notes,
    };
  }

  BookingModel copyWith({
    String? id,
    String? jobRequestId,
    String? serviceListingId,
    String? providerId,
    String? customerId,
    String? status,
    DateTime? scheduledAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    JobRequestModel? jobRequest,
    ProviderProfileModel? provider,
    String? customerName,
    String? customerPhone,
    String? serviceLocation,
    double? price,
    String? category,
    String? description,
    String? notes,
  }) {
    return BookingModel(
      id: id ?? this.id,
      jobRequestId: jobRequestId ?? this.jobRequestId,
      serviceListingId: serviceListingId ?? this.serviceListingId,
      providerId: providerId ?? this.providerId,
      customerId: customerId ?? this.customerId,
      status: status ?? this.status,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      jobRequest: jobRequest ?? this.jobRequest,
      provider: provider ?? this.provider,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      serviceLocation: serviceLocation ?? this.serviceLocation,
      price: price ?? this.price,
      category: category ?? this.category,
      description: description ?? this.description,
      notes: notes ?? this.notes,
    );
  }
}
