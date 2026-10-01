import 'package:intl/intl.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/predefined_slot_model.dart';

class ProviderAvailabilityRepository {
  final ApiClient? apiClient;

  ProviderAvailabilityRepository({this.apiClient});

  Future<DailySlotsModel> getPredefinedSlots({
    required String providerId,
    required DateTime date,
    int durationHours = 1,
  }) async {
    final client = apiClient;
    if (client == null) {
      return DailySlotsModel(
        providerId: providerId,
        date: date,
        durationHours: durationHours,
        isWorkingDay: false,
        slots: [],
      );
    }

    final dateStr = DateFormat('yyyy-MM-dd').format(date);
    final response = await client.get(
      ApiEndpoints.predefinedSlots,
      queryParams: {
        'providerId': providerId,
        'date': dateStr,
        'durationHours': durationHours.toString(),
      },
    );

    if (response is Map<String, dynamic>) {
      return DailySlotsModel.fromJson(response);
    }

    return DailySlotsModel(
      providerId: providerId,
      date: date,
      durationHours: durationHours,
      isWorkingDay: false,
      slots: [],
    );
  }
}
