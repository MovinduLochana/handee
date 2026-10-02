import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/models/service_listing_model.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/screens/customer/service_listing_details_screen.dart';

class FakeBookingRepository implements BookingRepository {
  BookingModel? lastCreatedBooking;
  Map<String, dynamic>? lastCallParams;
  bool shouldFail = false;
  String failureMessage = 'Provider is not available at the requested time slot.';

  @override
  late ApiClient apiClient;

  @override
  Future<BookingModel> createBookingFromListing({
    required String serviceListingId,
    required DateTime scheduledAt,
    String? notes,
  }) async {
    lastCallParams = {
      'serviceListingId': serviceListingId,
      'scheduledAt': scheduledAt,
      'notes': notes,
    };

    if (shouldFail) {
      throw ApiException(statusCode: 400, message: failureMessage);
    }

    final booking = BookingModel(
      id: 'book-new-123',
      serviceListingId: serviceListingId,
      providerId: 'prov-001',
      customerId: 'cust-001',
      status: 'Requested',
      scheduledAt: scheduledAt,
      price: 5000.0,
      notes: notes,
      createdAt: DateTime.now(),
    );
    lastCreatedBooking = booking;
    return booking;
  }

  @override
  Future<List<BookingModel>> getCustomerBookings() async => [];

  @override
  Future<List<BookingModel>> getProviderBookings() async => [];

  @override
  Future<BookingModel?> getBookingById(String id) async => null;

  @override
  Future<BookingModel> updateBookingSchedule(String bookingId, DateTime scheduledAt) async {
    throw UnimplementedError();
  }

  @override
  Future<BookingModel> updateBookingStatus(String bookingId, String newStatus) async {
    throw UnimplementedError();
  }

  @override
  Future<List<BookingModel>> getProviderBookingRequests() async => [];

  @override
  Future<BookingModel> confirmBooking(String bookingId) async {
    throw UnimplementedError();
  }

  @override
  Future<BookingModel> declineBooking(String bookingId, {String? reason}) async {
    throw UnimplementedError();
  }
}

void main() {
  final sampleListing = ServiceListingModel(
    id: 'listing-123',
    providerId: 'prov-001',
    serviceCategoryId: 'cat-001',
    serviceCategoryName: 'Electrical',
    title: 'Ceiling Fan Installation',
    description: 'Fast and safe ceiling fan installation.',
    scope: 'Wiring and mounting included',
    availability: 'Mon-Sat 8AM-6PM',
    fixedPrice: 3500.0,
    estimatedDuration: '1 hour',
    isActive: true,
  );

  test('BookingProvider.createBookingFromListing updates state and list', () async {
    final fakeRepo = FakeBookingRepository();
    final provider = BookingProvider(repository: fakeRepo);

    final scheduled = DateTime.utc(2026, 11, 1, 10, 0);
    final booking = await provider.createBookingFromListing(
      serviceListingId: 'listing-123',
      scheduledAt: scheduled,
      notes: 'Please bring ladder',
    );

    expect(booking, isNotNull);
    expect(booking!.id, 'book-new-123');
    expect(provider.bookings.length, 1);
    expect(provider.bookings.first.id, 'book-new-123');
    expect(fakeRepo.lastCallParams!['serviceListingId'], 'listing-123');
    expect(fakeRepo.lastCallParams!['notes'], 'Please bring ladder');
  });

  testWidgets('ServiceListingDetailsScreen opens booking sheet on Book Service tap', (tester) async {
    final fakeRepo = FakeBookingRepository();
    final bookingProvider = BookingProvider(repository: fakeRepo);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
        ],
        child: MaterialApp(
          home: ServiceListingDetailsScreen(listing: sampleListing),
        ),
      ),
    );

    // Initial state: Book Service button is present
    final bookButton = find.text('Book Service');
    expect(bookButton, findsOneWidget);

    await tester.tap(bookButton);
    await tester.pumpAndSettle();

    // The booking modal/sheet should appear with title and Confirm button
    expect(find.text('Confirm & Book'), findsOneWidget);
    expect(find.byType(TextField), findsWidgets);
  });

  testWidgets('ServiceListingDetailsScreen displays error when Confirm & Book tapped without selecting a slot', (tester) async {
    final fakeRepo = FakeBookingRepository();
    final bookingProvider = BookingProvider(repository: fakeRepo);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
        ],
        child: MaterialApp(
          home: ServiceListingDetailsScreen(listing: sampleListing),
        ),
      ),
    );

    // Open booking sheet
    await tester.tap(find.text('Book Service'));
    await tester.pumpAndSettle();

    // Tap Confirm & Book without selecting any slot
    await tester.tap(find.text('Confirm & Book'));
    await tester.pumpAndSettle();

    // Validation error should appear
    expect(find.text('Please select an available time slot.'), findsOneWidget);
    expect(fakeRepo.lastCreatedBooking, isNull);
  });
}
