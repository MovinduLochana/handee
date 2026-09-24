class ServiceCategoryModel {
  final String id;
  final String name;
  final double priceBandMin;
  final double priceBandMax;

  ServiceCategoryModel({
    required this.id,
    required this.name,
    required this.priceBandMin,
    required this.priceBandMax,
  });

  factory ServiceCategoryModel.fromJson(Map<String, dynamic> json) {
    return ServiceCategoryModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown Category',
      priceBandMin: (json['priceBandMin'] as num?)?.toDouble() ?? 0.0,
      priceBandMax: (json['priceBandMax'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'priceBandMin': priceBandMin,
      'priceBandMax': priceBandMax,
    };
  }
}
