import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/service_listing_model.dart';

class ServiceListingRepository {
  final ApiClient apiClient;

  ServiceListingRepository({required this.apiClient});

  Future<List<ServiceListingModel>> searchListings({String? query, String? categoryId}) async {
    final queryParams = <String, dynamic>{};
    if (query != null && query.isNotEmpty) queryParams['query'] = query;
    if (categoryId != null && categoryId.isNotEmpty) queryParams['categoryId'] = categoryId;

    final response = await apiClient.get(ApiEndpoints.serviceListings, queryParams: queryParams);

    if (response is List) {
      return response.map((json) => ServiceListingModel.fromJson(json as Map<String, dynamic>)).toList();
    }
    
    // In case it's paginated / returns data wrapped
    if (response is Map<String, dynamic>) {
      if (response.containsKey('data')) {
        final List<dynamic> dataList = response['data'];
        return dataList.map((json) => ServiceListingModel.fromJson(json as Map<String, dynamic>)).toList();
      } else if (response.containsKey('items')) {
        final List<dynamic> itemsList = response['items'];
        return itemsList.map((json) => ServiceListingModel.fromJson(json as Map<String, dynamic>)).toList();
      }
    }

    return [];
  }

  Future<List<ServiceListingModel>> getProviderListings(String providerId) async {
    final response = await apiClient.get(ApiEndpoints.providerServiceListings(providerId));

    if (response is List) {
      return response.map((json) => ServiceListingModel.fromJson(json as Map<String, dynamic>)).toList();
    }
    
    if (response is Map<String, dynamic>) {
      if (response.containsKey('data')) {
        final List<dynamic> dataList = response['data'];
        return dataList.map((json) => ServiceListingModel.fromJson(json as Map<String, dynamic>)).toList();
      } else if (response.containsKey('items')) {
        final List<dynamic> itemsList = response['items'];
        return itemsList.map((json) => ServiceListingModel.fromJson(json as Map<String, dynamic>)).toList();
      }
    }
    
    return [];
  }
}

