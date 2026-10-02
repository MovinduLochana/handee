import 'package:flutter/foundation.dart';
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

  Future<List<BookingModel>> getProviderBookingRequests() async {
    // 1. Primary endpoint: /api/provider/booking-requests
    try {
      final response = await apiClient.get(ApiEndpoints.providerBookingRequests);
      if (response is List) {
        return response
            .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
            .where((b) => b.isScheduled && b.isRequested)
            .toList();
      }
    } catch (e) {
      debugPrint('Error fetching from ${ApiEndpoints.providerBookingRequests}: $e');
    }

    // 2. Route fallback: /bookings/provider-requests
    try {
      final altResponse = await apiClient.get('/bookings/provider-requests');
      if (altResponse is List) {
        return altResponse
            .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
            .where((b) => b.isScheduled && b.isRequested)
            .toList();
      }
    } catch (_) {}

    // 3. Server deployment fallback: /bookings/provider-offers (deployed on live Azure, returning requested bookings)
    try {
      final legacyResponse = await apiClient.get('/bookings/provider-offers');
      if (legacyResponse is List) {
        return legacyResponse
            .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
            .where((b) => b.isScheduled && b.isRequested)
            .toList();
      }
    } catch (_) {}

    return [];
  }

  Future<BookingModel> confirmBooking(String bookingId) async {
    try {
      final response = await apiClient.post(ApiEndpoints.confirmBooking(bookingId));
      if (response is Map<String, dynamic>) {
        return BookingModel.fromJson(response);
      }
    } catch (_) {
      // Graceful fallback to PUT /bookings/{id}/status if dedicated confirm endpoint is unavailable
      return await updateBookingStatus(bookingId, 'Accepted');
    }
    final updated = await getBookingById(bookingId);
    if (updated != null) return updated;
    throw ApiException(statusCode: 500, message: 'Failed to confirm booking');
  }

  Future<BookingModel> declineBooking(String bookingId, {String? reason}) async {
    final response = await apiClient.post(
      ApiEndpoints.declineBooking(bookingId),
      body: reason != null ? {'reason': reason} : null,
    );
    if (response is Map<String, dynamic>) {
      return BookingModel.fromJson(response);
    }
    final updated = await getBookingById(bookingId);
    if (updated != null) return updated;
    throw ApiException(statusCode: 500, message: 'Failed to decline booking');
  }

  Future<BookingModel?> getBookingById(String id) async {
    final response = await apiClient.get(ApiEndpoints.bookingById(id));
    if (response is Map<String, dynamic>) {
      return BookingModel.fromJson(response);
    }
    return null;
  }

  /// PUT /bookings/{id}/schedule — maps to UpdateBookingScheduleDto.
  /// The backend allows rescheduling only while the booking is Requested or
  /// Accepted (admins excepted); outside that window it returns 400.
  Future<BookingModel> updateBookingSchedule(String bookingId, DateTime scheduledAt) async {
    final response = await apiClient.put(
      ApiEndpoints.updateBookingSchedule(bookingId),
      body: {'scheduledAt': scheduledAt.toUtc().toIso8601String()},
    );
    if (response is Map<String, dynamic>) {
      return BookingModel.fromJson(response);
    }

    final updated = await getBookingById(bookingId);
    if (updated != null) return updated;

    throw ApiException(statusCode: 500, message: 'Failed to update booking schedule');
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

  /// POST /bookings — creates a direct booking for a fixed-price service listing.
  Future<BookingModel> createBookingFromListing({
    required String serviceListingId,
    required DateTime scheduledAt,
    String? notes,
  }) async {
    final response = await apiClient.post(
      ApiEndpoints.bookings,
      body: {
        'serviceListingId': serviceListingId,
        'scheduledAt': scheduledAt.toUtc().toIso8601String(),
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );

    if (response is Map<String, dynamic>) {
      return BookingModel.fromJson(response);
    }

    throw ApiException(statusCode: 500, message: 'Failed to create booking from listing');
  }
}
