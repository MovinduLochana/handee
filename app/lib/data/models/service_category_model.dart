/// Mirrors the backend `ServiceCategoryResponseDto`.
class ServiceCategoryModel {
  final String id;
  final String name;
  final double? priceBandMin;
  final double? priceBandMax;

  ServiceCategoryModel({
    required this.id,
    required this.name,
    this.priceBandMin,
    this.priceBandMax,
  });

  factory ServiceCategoryModel.fromJson(Map<String, dynamic> json) {
    return ServiceCategoryModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown Category',
      priceBandMin: (json['priceBandMin'] as num?)?.toDouble(),
      priceBandMax: (json['priceBandMax'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'priceBandMin': priceBandMin,
        'priceBandMax': priceBandMax,
      };
}
