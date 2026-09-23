import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/service_category_model.dart';

class ServiceCategoryRepository {
  final ApiClient apiClient;

  ServiceCategoryRepository({required this.apiClient});

  /// GET /service-categories — public reference data, no auth required.
  Future<List<ServiceCategoryModel>> getCategories() async {
    final response = await apiClient.get(ApiEndpoints.serviceCategories);
    if (response is List) {
      return response
          .map((e) => ServiceCategoryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
