import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/booking_model.dart';

class BookingRepository {
  final ApiClient apiClient;

  BookingRepository({
    required this.apiClient,
  });

  Future<List<BookingModel>> getCustomerBookings() async {
    final response = await apiClient.get(ApiEndpoints.customerBookings);
    if (response is List) {
      return response.map((e) => BookingModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<List<BookingModel>> getProviderBookings() async {
    final response = await apiClient.get(ApiEndpoints.providerBookings);
    if (response is List) {
      return response.map((e) => BookingModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<BookingModel?> getBookingById(String id) async {
    final response = await apiClient.get(ApiEndpoints.bookingById(id));
    if (response is Map<String, dynamic>) {
      return BookingModel.fromJson(response);
    }
    return null;
  }

  Future<BookingModel> updateBookingStatus(String bookingId, String newStatus) async {
    final response = await apiClient.put(
      ApiEndpoints.updateBookingStatus(bookingId),
      body: {'status': newStatus},
    );
    if (response is Map<String, dynamic>) {
      return BookingModel.fromJson(response);
    }
    // If backend returns NoContent or non-map, re-fetch
    final updated = await getBookingById(bookingId);
    if (updated != null) return updated;

    throw ApiException(statusCode: 500, message: 'Failed to update booking status');
  }
}
