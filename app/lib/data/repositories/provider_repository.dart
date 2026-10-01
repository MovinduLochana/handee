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

    // The API returns a paged response with 'items' or 'data'.
    List<dynamic> jsonList = [];
    if (response is List) {
      jsonList = response;
    } else if (response is Map<String, dynamic>) {
      final raw = response['items'] ?? response['Items'] ?? response['data'] ?? response['Data'];
      if (raw is List) {
        jsonList = raw;
      }
    }

    return jsonList.map((json) => ProviderProfileModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<ProviderProfileModel> getProviderProfile(String id) async {
    final response = await apiClient.get(ApiEndpoints.providerById(id));
    return ProviderProfileModel.fromJson(response as Map<String, dynamic>);
  }

  /// GET /api/providers/me — resolves own profile
  Future<ProviderProfileModel> getMyProfile() async {
    final response = await apiClient.get(ApiEndpoints.providerProfile);
    return ProviderProfileModel.fromJson(response as Map<String, dynamic>);
  }

  /// PUT /api/providers/{id} — updates own profile
  Future<ProviderProfileModel> updateMyProfile({
    required String profileId,
    String? headline,
    String? bio,
    String? description,
    int? yearsOfExperience,
    List<String>? languages,
    List<String>? servicesOffered,
    bool? isAvailableForWork,
    List<String>? serviceCategoryIds,
    String? city,
    String? addressLine1,
    double? hourlyRate,
    double? serviceRadiusKm,
    double? serviceAreaLatitude,
    double? serviceAreaLongitude,
  }) async {
    final body = <String, dynamic>{};
    if (headline != null) body['headline'] = headline;
    if (bio != null) body['bio'] = bio;
    if (description != null) body['description'] = description;
    if (yearsOfExperience != null) body['yearsOfExperience'] = yearsOfExperience;
    if (languages != null) body['languages'] = languages;
    if (servicesOffered != null) body['servicesOffered'] = servicesOffered;
    if (isAvailableForWork != null) body['isAvailableForWork'] = isAvailableForWork;
    if (serviceCategoryIds != null) body['serviceCategoryIds'] = serviceCategoryIds;
    if (city != null) body['city'] = city;
    if (addressLine1 != null) body['addressLine1'] = addressLine1;
    if (hourlyRate != null) body['hourlyRate'] = hourlyRate;
    if (serviceRadiusKm != null) body['serviceRadiusKm'] = serviceRadiusKm;
    if (serviceAreaLatitude != null) body['serviceAreaLatitude'] = serviceAreaLatitude;
    if (serviceAreaLongitude != null) body['serviceAreaLongitude'] = serviceAreaLongitude;

    await apiClient.put(ApiEndpoints.providerById(profileId), body: body);
    try {
      return await getMyProfile();
    } catch (_) {
      return await getProviderProfile(profileId);
    }
  }

  /// POST /api/providers/{id}/documents — uploads an identity or trade document
  Future<Map<String, dynamic>> uploadDocument({
    required String profileId,
    required String filePath,
    required String documentType, // "NIC", "TradeCertification", "Other"
  }) async {
    final response = await apiClient.postMultipart(
      '/api/providers/$profileId/documents',
      fileField: 'File',
      filePath: filePath,
      fields: {'Type': documentType},
    );
    if (response is Map<String, dynamic>) {
      return response;
    }
    return {'status': 'uploaded'};
  }
}

