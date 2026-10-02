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
  final String? providerName;
  final String? serviceLocation;
  final double? latitude;
  final double? longitude;
  final double? price;

  /// Flat fields on BookingResponseDto, resolved server-side from the linked
  /// JobRequest. The nested [jobRequest] object is never sent by the backend,
  /// so read category/description from these.
  final String? category;
  final String? description;
  final String? notes;
  final int durationHours;
  final String bookingType;
  final DateTime? expiresAt;
  final int? remainingSeconds;

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
    this.providerName,
    this.serviceLocation,
    this.latitude,
    this.longitude,
    this.price,
    this.category,
    this.description,
    this.notes,
    this.durationHours = 1,
    this.bookingType = 'Scheduled',
    this.expiresAt,
    this.remainingSeconds,
  });

  bool get isRequested => status.toLowerCase() == 'requested';
  bool get isAccepted => status.toLowerCase() == 'accepted';
  bool get isInProgress => status.toLowerCase() == 'inprogress' || status.toLowerCase() == 'in_progress';
  bool get isCompleted => status.toLowerCase() == 'completed';
  bool get isDisputed => status.toLowerCase() == 'disputed';
  bool get isExpired => status.toLowerCase() == 'expired';
  bool get isDeclined =>
      status.toLowerCase() == 'declined' ||
      status.toLowerCase() == 'rejected' ||
      status.toLowerCase() == 'cancelled' ||
      status.toLowerCase() == 'canceled';
  bool get isRejected => isDeclined;

  DateTime? get calculatedEndTime {
    if (scheduledAt == null) return null;
    final duration = durationHours > 0 ? durationHours : 1;
    return scheduledAt!.add(Duration(hours: duration));
  }

  bool overlapsWith(BookingModel other, {Duration buffer = Duration.zero}) {
    if (isDeclined || isExpired || status.toLowerCase() == 'cancelled' || status.toLowerCase() == 'canceled') return false;
    if (other.isDeclined || other.isExpired || other.status.toLowerCase() == 'cancelled' || other.status.toLowerCase() == 'canceled') return false;
    if (scheduledAt == null || other.scheduledAt == null) return false;

    final thisStart = scheduledAt!;
    final thisEnd = calculatedEndTime!;
    final otherStart = other.scheduledAt!;
    final otherEnd = other.calculatedEndTime!;

    final effectiveThisStart = thisStart.subtract(buffer);
    final effectiveThisEnd = thisEnd.add(buffer);

    return effectiveThisStart.isBefore(otherEnd) && effectiveThisEnd.isAfter(otherStart);
  }

  bool get isInstantMatch {
    final type = bookingType.toLowerCase();
    if (type == 'instantmatch' || type == 'instant_match') return true;
    if (type == 'scheduled') return false;
    return serviceListingId == null && jobRequestId != null && scheduledAt == null;
  }
  bool get isScheduled => !isInstantMatch;

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
      case 'expired':
        return 'Expired';
      case 'declined':
        return 'Declined';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
      case 'canceled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    final rawBookingType = json['bookingType']?.toString() ?? json['BookingType']?.toString();
    final rawServiceListingId = json['serviceListingId']?.toString() ?? json['ServiceListingId']?.toString();
    final rawJobRequestId = json['jobRequestId']?.toString() ?? json['JobRequestId']?.toString();
    final resolvedBookingType = rawBookingType ??
        (rawServiceListingId != null
            ? 'Scheduled'
            : (rawJobRequestId != null ? 'InstantMatch' : 'Scheduled'));

    return BookingModel(
      id: json['id']?.toString() ?? json['Id']?.toString() ?? '',
      jobRequestId: rawJobRequestId,
      serviceListingId: rawServiceListingId,
      providerId: json['providerId']?.toString() ?? json['ProviderId']?.toString() ?? '',
      customerId: json['customerId']?.toString() ?? json['CustomerId']?.toString() ?? '',
      status: json['status']?.toString() ?? json['Status']?.toString() ?? 'Requested',
      scheduledAt: (json['scheduledAt'] != null || json['ScheduledAt'] != null)
          ? DateTime.tryParse((json['scheduledAt'] ?? json['ScheduledAt']).toString())
          : null,
      createdAt: (json['createdAt'] != null || json['CreatedAt'] != null)
          ? DateTime.tryParse((json['createdAt'] ?? json['CreatedAt']).toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: (json['updatedAt'] != null || json['UpdatedAt'] != null)
          ? DateTime.tryParse((json['updatedAt'] ?? json['UpdatedAt']).toString())
          : null,
      jobRequest: (json['jobRequest'] ?? json['JobRequest']) != null
          ? JobRequestModel.fromJson((json['jobRequest'] ?? json['JobRequest']) as Map<String, dynamic>)
          : null,
      provider: (json['provider'] ?? json['Provider']) != null
          ? ProviderProfileModel.fromJson((json['provider'] ?? json['Provider']) as Map<String, dynamic>)
          : null,
      customerName: json['customerName']?.toString() ?? json['CustomerName']?.toString(),
      customerPhone: json['customerPhone']?.toString() ?? json['CustomerPhone']?.toString(),
      providerName: json['providerName']?.toString() ?? json['ProviderName']?.toString(),
      serviceLocation: () {
        final raw = json['serviceLocation']?.toString() ?? json['ServiceLocation']?.toString();
        if (raw == null) return null;
        return raw.replaceAll(RegExp(r'\s*\[\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\]'), '').trim();
      }(),
      latitude: (json['latitude'] as num?)?.toDouble() ??
          (json['Latitude'] as num?)?.toDouble() ??
          () {
            final raw = json['serviceLocation']?.toString() ?? json['ServiceLocation']?.toString();
            if (raw == null) return null;
            final m = RegExp(r'\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]').firstMatch(raw);
            return m != null ? double.tryParse(m.group(1)!) : null;
          }(),
      longitude: (json['longitude'] as num?)?.toDouble() ??
          (json['Longitude'] as num?)?.toDouble() ??
          () {
            final raw = json['serviceLocation']?.toString() ?? json['ServiceLocation']?.toString();
            if (raw == null) return null;
            final m = RegExp(r'\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]').firstMatch(raw);
            return m != null ? double.tryParse(m.group(2)!) : null;
          }(),
      price: (json['price'] as num?)?.toDouble() ?? (json['Price'] as num?)?.toDouble(),
      category: json['category']?.toString() ?? json['Category']?.toString(),
      description: json['description']?.toString() ?? json['Description']?.toString(),
      notes: json['notes']?.toString() ?? json['Notes']?.toString(),
      durationHours: (json['durationHours'] as num?)?.toInt() ??
          (json['DurationHours'] as num?)?.toInt() ??
          1,
      bookingType: resolvedBookingType,
      expiresAt: (json['expiresAt'] != null || json['ExpiresAt'] != null)
          ? DateTime.tryParse((json['expiresAt'] ?? json['ExpiresAt']).toString())
          : null,
      remainingSeconds: (json['remainingSeconds'] as num?)?.toInt() ??
          (json['RemainingSeconds'] as num?)?.toInt(),
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
      'customerName': customerName,
      'customerPhone': customerPhone,
      'providerName': providerName,
      'serviceLocation': serviceLocation,
      'latitude': latitude,
      'longitude': longitude,
      'price': price,
      'category': category,
      'description': description,
      'notes': notes,
      'durationHours': durationHours,
      'bookingType': bookingType,
      'expiresAt': expiresAt?.toIso8601String(),
      'remainingSeconds': remainingSeconds,
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
    String? providerName,
    String? serviceLocation,
    double? latitude,
    double? longitude,
    double? price,
    String? category,
    String? description,
    String? notes,
    int? durationHours,
    String? bookingType,
    DateTime? expiresAt,
    int? remainingSeconds,
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
      providerName: providerName ?? this.providerName,
      serviceLocation: serviceLocation ?? this.serviceLocation,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      price: price ?? this.price,
      category: category ?? this.category,
      description: description ?? this.description,
      notes: notes ?? this.notes,
      durationHours: durationHours ?? this.durationHours,
      bookingType: bookingType ?? this.bookingType,
      expiresAt: expiresAt ?? this.expiresAt,
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
    );
  }
}
