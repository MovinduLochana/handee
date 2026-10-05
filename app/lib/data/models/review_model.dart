import '../../core/constants/api_endpoints.dart';

class ReviewModel {
  final String id;
  final String providerProfileId;
  final String customerId;
  final String customerName;
  final String? customerProfilePictureUrl;
  final int rating;
  final String? comment;
  final List<String> photoUrls;
  final DateTime createdAt;
  final DateTime? updatedAt;

  ReviewModel({
    required this.id,
    required this.providerProfileId,
    required this.customerId,
    required this.customerName,
    this.customerProfilePictureUrl,
    required this.rating,
    this.comment,
    this.photoUrls = const [],
    required this.createdAt,
    this.updatedAt,
  });

  String? get fullCustomerPhotoUrl {
    if (customerProfilePictureUrl == null || customerProfilePictureUrl!.isEmpty) {
      return null;
    }
    if (customerProfilePictureUrl!.startsWith('http://') ||
        customerProfilePictureUrl!.startsWith('https://')) {
      return customerProfilePictureUrl;
    }
    final cleanPath = customerProfilePictureUrl!.startsWith('/')
        ? customerProfilePictureUrl!
        : '/$customerProfilePictureUrl';
    return '${ApiEndpoints.baseUrl}$cleanPath';
  }

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    final rawPhotos = json['photoUrls'] ?? json['PhotoUrls'];
    List<String> photos = [];
    if (rawPhotos is List) {
      photos = rawPhotos.map((e) => e.toString()).toList();
    }

    final rawCreatedAt = json['createdAt'] ?? json['CreatedAt'];
    final createdAtParsed = rawCreatedAt != null
        ? DateTime.tryParse(rawCreatedAt.toString())?.toLocal() ?? DateTime.now()
        : DateTime.now();

    final rawUpdatedAt = json['updatedAt'] ?? json['UpdatedAt'];
    final updatedAtParsed = rawUpdatedAt != null
        ? DateTime.tryParse(rawUpdatedAt.toString())?.toLocal()
        : null;

    final rawRating = json['rating'] ?? json['Rating'];
    final ratingVal = (rawRating as num?)?.toInt() ?? 5;

    return ReviewModel(
      id: json['id']?.toString() ?? '',
      providerProfileId: (json['providerProfileId'] ?? json['ProviderProfileId'])?.toString() ?? '',
      customerId: (json['customerId'] ?? json['CustomerId'])?.toString() ?? '',
      customerName: (json['customerName'] ?? json['CustomerName'])?.toString() ?? 'Anonymous Customer',
      customerProfilePictureUrl: (json['customerProfilePictureUrl'] ?? json['CustomerProfilePictureUrl'])?.toString(),
      rating: ratingVal,
      comment: (json['comment'] ?? json['Comment'])?.toString(),
      photoUrls: photos,
      createdAt: createdAtParsed,
      updatedAt: updatedAtParsed,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'providerProfileId': providerProfileId,
      'customerId': customerId,
      'customerName': customerName,
      'customerProfilePictureUrl': customerProfilePictureUrl,
      'rating': rating,
      'comment': comment,
      'photoUrls': photoUrls,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}

class PagedReviewResponse {
  final List<ReviewModel> items;
  final int totalCount;
  final int page;
  final int pageSize;

  PagedReviewResponse({
    required this.items,
    required this.totalCount,
    required this.page,
    required this.pageSize,
  });

  factory PagedReviewResponse.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] ?? json['Items'] ?? json['data'] ?? json['Data'] ?? [];
    final itemsList = (rawItems as List)
        .map((e) => ReviewModel.fromJson(e as Map<String, dynamic>))
        .toList();

    return PagedReviewResponse(
      items: itemsList,
      totalCount: (json['totalCount'] ?? json['TotalCount'] as num?)?.toInt() ?? itemsList.length,
      page: (json['page'] ?? json['Page'] as num?)?.toInt() ?? 1,
      pageSize: (json['pageSize'] ?? json['PageSize'] as num?)?.toInt() ?? 10,
    );
  }
}
