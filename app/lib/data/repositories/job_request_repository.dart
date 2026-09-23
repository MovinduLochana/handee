import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/services/storage_service.dart';
import '../models/job_request_model.dart';

class JobRequestRepository {
  final ApiClient apiClient;
  final StorageService storage;

  JobRequestRepository({
    required this.apiClient,
    required this.storage,
  });

  Future<JobRequestModel> createJobRequest({
    required String categoryId,
    required String category,
    required String description,
    required String location,
    required String urgency,
    double? budgetMin,
    double? budgetMax,
    List<String> photoUrls = const [],
  }) async {
    final payload = {
      'serviceCategoryId': categoryId,
      'category': category,
      'description': description,
      'location': location,
      'urgency': urgency,
      'budgetMin': budgetMin,
      'budgetMax': budgetMax,
      'photoUrls': photoUrls,
    };

    final response = await apiClient.post(ApiEndpoints.jobRequests, body: payload);
    return JobRequestModel.fromJson(response as Map<String, dynamic>);
  }

  Future<List<JobRequestModel>> getMyJobRequests() async {
    final response = await apiClient.get(ApiEndpoints.myJobRequests);
    if (response is List) {
      return response.map((e) => JobRequestModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<JobRequestModel?> getJobRequestById(String id) async {
    final response = await apiClient.get(ApiEndpoints.jobRequestById(id));
    if (response is Map<String, dynamic>) {
      return JobRequestModel.fromJson(response);
    }
    return null;
  }
}
