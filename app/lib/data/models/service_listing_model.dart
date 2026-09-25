
class ServiceListingModel {
  final String id;
  final String providerId;
  final String serviceCategoryId;
  final String title;
  final String description;
  final String scope;
  final String availability;
  final double fixedPrice;
  final String estimatedDuration;
  final bool isActive;
  final String? serviceCategoryName;
  final String? providerFullName;

  ServiceListingModel({
    required this.id,
    required this.providerId,
    required this.serviceCategoryId,
    required this.title,
    required this.description,
    required this.scope,
    required this.availability,
    required this.fixedPrice,
    required this.estimatedDuration,
    required this.isActive,
    this.serviceCategoryName,
    this.providerFullName,
  });

  factory ServiceListingModel.fromJson(Map<String, dynamic> json) {
    return ServiceListingModel(
      id: json['id']?.toString() ?? '',
      providerId: json['providerId']?.toString() ?? '',
      serviceCategoryId: json['serviceCategoryId']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      scope: json['scope']?.toString() ?? '',
      availability: json['availability']?.toString() ?? '',
      fixedPrice: (json['fixedPrice'] as num?)?.toDouble() ?? 0.0,
      estimatedDuration: json['estimatedDuration']?.toString() ?? '00:00:00',
      isActive: json['isActive'] as bool? ?? false,
      serviceCategoryName: json['serviceCategoryName']?.toString(),
      providerFullName: json['providerFullName']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'providerId': providerId,
      'serviceCategoryId': serviceCategoryId,
      'title': title,
      'description': description,
      'scope': scope,
      'availability': availability,
      'fixedPrice': fixedPrice,
      'estimatedDuration': estimatedDuration,
      'isActive': isActive,
      'serviceCategoryName': serviceCategoryName,
      'providerFullName': providerFullName,
    };
  }
}
