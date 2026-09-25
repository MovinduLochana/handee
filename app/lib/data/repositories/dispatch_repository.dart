import 'package:flutter/foundation.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/services/storage_service.dart';
import '../models/booking_model.dart';
import '../models/provider_profile_model.dart';

class DispatchRepository {
  final ApiClient apiClient;
  final StorageService storage;

  DispatchRepository({
    required this.apiClient,
    required this.storage,
  });

  /// GET /bookings/provider-offers returns BookingResponseDto (bookings in
  /// Requested status for this provider), so it deserializes to BookingModel.
  /// It previously mapped into JobRequestModel, which meant reading
  /// booking-only fields (customerName, price, serviceLocation) off the wrong
  /// model.
  Future<List<BookingModel>> getIncomingOffers() async {
    try {
      final response = await apiClient.get('/bookings/provider-offers');
      if (response is List) {
        return response
            .map((b) => BookingModel.fromJson(b as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint('Error fetching incoming provider offers: $e');
    }
    return [];
  }

  Future<void> acceptOffer(String bookingId) async {
    await apiClient.put(
      ApiEndpoints.updateBookingStatus(bookingId),
      body: {'status': 'Accepted'},
    );
  }

  Future<void> declineOffer(String bookingId) async {
    // Optionally flag or update
    debugPrint('Declining offer for booking: $bookingId');
  }

  Future<ProviderProfileModel> getProviderProfile() async {
    try {
      final response = await apiClient.get('/api/providers/me');
      if (response is Map<String, dynamic>) {
        return ProviderProfileModel.fromJson(response);
      }
    } catch (e) {
      debugPrint('Could not fetch remote provider profile: $e');
    }

    final userId = storage.getUserId() ?? 'provider-id';
    final name = storage.getUserName() ?? 'Service Provider';
    return ProviderProfileModel(
      id: userId,
      userId: userId,
      fullName: name,
      skillCategories: ['Plumbing', 'Electrical'],
      serviceArea: 'Colombo',
      isVerified: true,
      rating: 4.8,
    );
  }
}
