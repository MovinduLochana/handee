import 'package:flutter_test/flutter_test.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/providers/booking_provider.dart';

class MockDecliningRepo implements BookingRepository {
  List<BookingModel> providerBookings = [];
  List<BookingModel> providerRequests = [];

  @override
  late ApiClient apiClient;

  @override
  Future<List<BookingModel>> getCustomerBookings() async => [];

  @override
  Future<List<BookingModel>> getProviderBookings() async => providerBookings;

  @override
  Future<List<BookingModel>> getProviderBookingRequests() async => providerRequests;

  @override
  Future<BookingModel?> getBookingById(String id) async {
    final all = [...providerBookings, ...providerRequests];
    return all.cast<BookingModel?>().firstWhere((b) => b?.id == id, orElse: () => null);
  }

  @override
  Future<BookingModel> declineBooking(String bookingId, {String? reason}) async {
    final all = [...providerBookings, ...providerRequests];
    final found = all.firstWhere((b) => b.id == bookingId);
    final declined = found.copyWith(
      status: 'Declined',
      notes: reason != null ? '[Declined reason: $reason]' : found.notes,
    );
    return declined;
  }

  @override
  Future<BookingModel> createBookingFromListing({
    required String serviceListingId,
    required DateTime scheduledAt,
    String? notes,
  }) async =>
      throw UnimplementedError();

  @override
  Future<BookingModel> confirmBooking(String bookingId) async =>
      throw UnimplementedError();

  @override
  Future<BookingModel> updateBookingSchedule(String bookingId, DateTime scheduledAt) async =>
      throw UnimplementedError();

  @override
  Future<BookingModel> updateBookingStatus(String bookingId, String newStatus) async =>
      throw UnimplementedError();
}

void main() {
  test('BookingProvider.declineBooking keeps booking in pastScheduledBookings (History) and removes from pendingRequests', () async {
    final repo = MockDecliningRepo();
    final requestedBooking = BookingModel(
      id: 'book-sched-99',
      providerId: 'prov-001',
      customerId: 'cust-001',
      customerName: 'Nadeeka',
      status: 'Requested',
      bookingType: 'Scheduled',
      category: 'Carpentry',
      scheduledAt: DateTime.now().add(const Duration(days: 3)),
      price: 6000.0,
      createdAt: DateTime.now(),
    );

    repo.providerRequests = [requestedBooking];
    repo.providerBookings = [requestedBooking];

    final provider = BookingProvider(repository: repo);
    await provider.fetchProviderBookings();

    expect(provider.pendingRequests.length, 1);
    expect(provider.pendingScheduledCount, 1);
    expect(provider.pastScheduledBookings.length, 0);

    // Decline booking
    final success = await provider.declineBooking('book-sched-99', reason: 'Not available on that day');
    expect(success, isTrue);

    // Pending requests should be cleared
    expect(provider.pendingRequests.length, 0);
    expect(provider.pendingScheduledCount, 0);

    // Booking should now be in pastScheduledBookings (History) with status Declined!
    expect(provider.pastScheduledBookings.length, 1);
    expect(provider.pastScheduledBookings.first.id, 'book-sched-99');
    expect(provider.pastScheduledBookings.first.isDeclined, isTrue);
    expect(provider.pastScheduledBookings.first.status, 'Declined');
    expect(provider.pastScheduledBookings.first.notes, '[Declined reason: Not available on that day]');
  });
}
