import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/screens/customer/customer_bookings_screen.dart';

class MockBookingRepository implements BookingRepository {
  List<BookingModel> customerBookings = [];

  @override
  late ApiClient apiClient;

  @override
  Future<List<BookingModel>> getCustomerBookings() async => customerBookings;

  @override
  Future<List<BookingModel>> getProviderBookings() async => [];

  @override
  Future<List<BookingModel>> getProviderBookingRequests() async => [];

  @override
  Future<BookingModel?> getBookingById(String id) async =>
      customerBookings.cast<BookingModel?>().firstWhere((b) => b?.id == id, orElse: () => null);

  @override
  Future<BookingModel> createBookingFromListing({
    required String serviceListingId,
    required DateTime scheduledAt,
    String? serviceLocation,
    double? latitude,
    double? longitude,
    String? notes,
  }) async =>
      throw UnimplementedError();

  @override
  Future<BookingModel> confirmBooking(String bookingId) async =>
      throw UnimplementedError();

  @override
  Future<BookingModel> declineBooking(String bookingId, {String? reason}) async =>
      throw UnimplementedError();

  @override
  Future<BookingModel> updateBookingSchedule(String bookingId, DateTime scheduledAt) async =>
      throw UnimplementedError();

  @override
  Future<BookingModel> updateBookingStatus(String bookingId, String newStatus) async =>
      throw UnimplementedError();
}

void main() {
  testWidgets('CustomerBookingsScreen renders 5 tabs and shows declined scheduled booking under Declined tab', (tester) async {
    final mockRepo = MockBookingRepository();
    final declinedBooking = BookingModel(
      id: 'book-declined-1',
      providerId: 'prov-001',
      providerName: 'Kasun Electrician',
      customerId: 'cust-001',
      status: 'Declined',
      bookingType: 'Scheduled',
      category: 'Electrical Wiring',
      description: 'Main breaker repair',
      scheduledAt: DateTime.now().add(const Duration(days: 1)),
      notes: '[Declined reason: Fully booked on requested date]',
      price: 4500.0,
      createdAt: DateTime.now(),
    );

    final pendingBooking = BookingModel(
      id: 'book-pending-1',
      providerId: 'prov-002',
      providerName: 'Sunil Carpenter',
      customerId: 'cust-001',
      status: 'Requested',
      bookingType: 'Scheduled',
      category: 'Woodwork',
      description: 'Door hinge replacement',
      scheduledAt: DateTime.now().add(const Duration(days: 2)),
      price: 3000.0,
      createdAt: DateTime.now(),
    );

    final activeBooking = BookingModel(
      id: 'book-active-1',
      providerId: 'prov-003',
      providerName: 'Nimal Plumber',
      customerId: 'cust-001',
      status: 'Accepted',
      bookingType: 'Scheduled',
      category: 'Plumbing',
      description: 'Pipe fix',
      scheduledAt: DateTime.now().add(const Duration(days: 3)),
      price: 3500.0,
      createdAt: DateTime.now(),
    );

    mockRepo.customerBookings = [declinedBooking, pendingBooking, activeBooking];

    final provider = BookingProvider(repository: mockRepo);
    await provider.fetchCustomerBookings();

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<BookingProvider>.value(
          value: provider,
          child: const CustomerBookingsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify all 5 tabs are displayed with their counts
    expect(find.text('Active (1)'), findsOneWidget);
    expect(find.text('Pending (1)'), findsOneWidget);
    expect(find.text('Completed (0)'), findsOneWidget);
    expect(find.text('Declined (1)'), findsOneWidget);
    expect(find.text('All (3)'), findsOneWidget);

    // Switch to Declined tab
    await tester.tap(find.text('Declined (1)'));
    await tester.pumpAndSettle();

    // Verify declined booking card is visible
    expect(find.text('Kasun Electrician'), findsOneWidget);
    expect(find.text('Electrical Wiring'), findsOneWidget);
    expect(find.text('Declined'), findsOneWidget); // StatusBadge label

    // Switch to Pending tab
    await tester.tap(find.text('Pending (1)'));
    await tester.pumpAndSettle();

    expect(find.text('Sunil Carpenter'), findsOneWidget);
    expect(find.text('Woodwork'), findsOneWidget);
  });
}
