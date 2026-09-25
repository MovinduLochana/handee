import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/service_category_model.dart';

class ServiceCategoryRepository {
  final ApiClient apiClient;

  ServiceCategoryRepository({required this.apiClient});

  Future<List<ServiceCategoryModel>> getCategories() async {
    final response = await apiClient.get(ApiEndpoints.serviceCategories);

    List<dynamic> jsonList = [];
    if (response is List) {
      jsonList = response;
    } else if (response is Map<String, dynamic>) {
      if (response.containsKey('data')) {
        jsonList = response['data'] as List<dynamic>;
      } else if (response.containsKey('items')) {
        jsonList = response['items'] as List<dynamic>;
      }
    }

    return jsonList
        .map((json) => ServiceCategoryModel.fromJson(json as Map<String, dynamic>))
        .toList();
  }
  }
}
