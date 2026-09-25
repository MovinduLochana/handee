import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/provider_profile_model.dart';

class ProviderRepository {
  final ApiClient apiClient;

  ProviderRepository({required this.apiClient});

  Future<List<ProviderProfileModel>> searchProviders({
    String? searchTerm,
    String? serviceCategoryId,
    double? lat,
    double? lng,
    double radiusKm = 25,
    int page = 1,
    int pageSize = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'radiusKm': radiusKm.toString(),
      'page': page.toString(),
      'pageSize': pageSize.toString(),
    };
    
    if (searchTerm != null && searchTerm.isNotEmpty) queryParams['searchTerm'] = searchTerm;
    if (serviceCategoryId != null && serviceCategoryId.isNotEmpty) queryParams['serviceCategoryId'] = serviceCategoryId;
    if (lat != null) queryParams['lat'] = lat.toString();
    if (lng != null) queryParams['lng'] = lng.toString();

    final response = await apiClient.get(ApiEndpoints.providersSearch, queryParams: queryParams);

    // The API might return a paged response with 'items' or 'data'.
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

    return jsonList.map((json) => ProviderProfileModel.fromJson(json)).toList();
  }

  Future<ProviderProfileModel> getProviderProfile(String id) async {
    final response = await apiClient.get(ApiEndpoints.providerById(id));
    return ProviderProfileModel.fromJson(response as Map<String, dynamic>);
  }
}

