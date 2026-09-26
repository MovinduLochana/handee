import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/provider_availability_slot_model.dart';

class ProviderAvailabilityRepository {
  final ApiClient? apiClient;

  ProviderAvailabilityRepository({this.apiClient});

  Future<List<ProviderAvailabilitySlotModel>> getForProvider(
    String providerId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final client = apiClient;
    if (client == null) return [];

    final Map<String, dynamic> params = {};
    if (startDate != null) {
      params['startDate'] = startDate.toUtc().toIso8601String();
    }
    if (endDate != null) {
      params['endDate'] = endDate.toUtc().toIso8601String();
    }

    final response = await client.get(
      ApiEndpoints.providerAvailability(providerId),
      queryParams: params.isNotEmpty ? params : null,
    );

    if (response is List) {
      return response
          .map((e) => ProviderAvailabilitySlotModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
