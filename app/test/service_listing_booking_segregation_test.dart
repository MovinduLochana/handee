import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/dispatch_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/screens/provider/provider_jobs_screen.dart';

class MockDispatchRepository extends DispatchRepository {
  final List<BookingModel> offersToReturn;

  MockDispatchRepository({
    required this.offersToReturn,
    required super.apiClient,
    required super.storage,
  });

  @override
  Future<List<BookingModel>> getIncomingOffers() async {
    return offersToReturn.where((b) => b.isInstantMatch).toList();
  }
}

class MockBookingRepository extends BookingRepository {
  final List<BookingModel> allBookings;
  final List<BookingModel> scheduledRequests;

  MockBookingRepository({
    required this.allBookings,
    required this.scheduledRequests,
    required super.apiClient,
  });

  @override
  Future<List<BookingModel>> getProviderBookings() async => allBookings;

  @override
  Future<List<BookingModel>> getProviderBookingRequests() async =>
      scheduledRequests.where((b) => b.isScheduled).toList();

  @override
  Future<BookingModel> confirmBooking(String bookingId) async {
    final idx = scheduledRequests.indexWhere((b) => b.id == bookingId);
    if (idx != -1) {
      final updated = scheduledRequests[idx].copyWith(status: 'Accepted');
      scheduledRequests[idx] = updated;
      return updated;
    }
    final allIdx = allBookings.indexWhere((b) => b.id == bookingId);
    if (allIdx != -1) {
      final updated = allBookings[allIdx].copyWith(status: 'Accepted');
      allBookings[allIdx] = updated;
      return updated;
    }
    throw ApiException(statusCode: 404, message: 'Not found');
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;
  late ApiClient apiClient;

  setUp(() async {
    SharedPreferences.setMockInitialValues({'auth_access_token': 'test_token'});
    storage = await StorageService.getInstance();
    apiClient = ApiClient(storage: storage);
  });

  group('Service Listing Booking Segregation Tests', () {
    test('BookingModel classifies service listing bookings strictly as Scheduled and NOT InstantMatch', () {
      // 1. Fully specified JSON from backend
      final listingBooking = BookingModel.fromJson({
        'id': 'listing-bk-1',
        'serviceListingId': 'listing-456',
        'jobRequestId': null,
        'providerId': 'prov-1',
        'customerId': 'cust-1',
        'status': 'Requested',
        'scheduledAt': '2026-10-05T10:00:00Z',
        'createdAt': '2026-10-01T12:00:00Z',
        'bookingType': 'Scheduled',
        'price': 4500.0,
        'category': 'Plumbing',
      });

      expect(listingBooking.isInstantMatch, isFalse);
      expect(listingBooking.isScheduled, isTrue);
      expect(listingBooking.bookingType, 'Scheduled');

      // 2. Legacy backend response where bookingType is omitted
      final legacyBooking = BookingModel.fromJson({
        'id': 'listing-bk-2',
        'serviceListingId': 'listing-456',
        'jobRequestId': null,
        'providerId': 'prov-1',
        'customerId': 'cust-1',
        'status': 'Requested',
        'scheduledAt': '2026-10-05T10:00:00Z',
        'createdAt': '2026-10-01T12:00:00Z',
        'price': 4500.0,
      });

      expect(legacyBooking.isInstantMatch, isFalse);
      expect(legacyBooking.isScheduled, isTrue);
      expect(legacyBooking.bookingType, 'Scheduled');

      // 3. True InstantMatch booking (for contrast)
      final instantBooking = BookingModel.fromJson({
        'id': 'instant-bk-1',
        'serviceListingId': null,
        'jobRequestId': 'job-req-789',
        'providerId': 'prov-1',
        'customerId': 'cust-1',
        'status': 'Requested',
        'bookingType': 'InstantMatch',
        'price': 3500.0,
      });

      expect(instantBooking.isInstantMatch, isTrue);
      expect(instantBooking.isScheduled, isFalse);
    });

    test('DispatchRepository excludes service listing bookings from incomingOffers', () async {
      final listingBooking = BookingModel(
        id: 'listing-bk-1',
        serviceListingId: 'listing-456',
        providerId: 'prov-1',
        customerId: 'cust-1',
        status: 'Requested',
        bookingType: 'Scheduled',
        createdAt: DateTime.now(),
      );

      final instantBooking = BookingModel(
        id: 'instant-bk-1',
        jobRequestId: 'job-req-789',
        providerId: 'prov-1',
        customerId: 'cust-1',
        status: 'Requested',
        bookingType: 'InstantMatch',
        createdAt: DateTime.now(),
      );

      final dispatchRepo = MockDispatchRepository(
        offersToReturn: [listingBooking, instantBooking],
        apiClient: apiClient,
        storage: storage,
      );

      final offers = await dispatchRepo.getIncomingOffers();
      expect(offers.length, 1);
      expect(offers.first.id, 'instant-bk-1');
      expect(offers.any((b) => b.id == 'listing-bk-1'), isFalse);
    });

    test('BookingProvider places service listing booking in pendingRequests and scheduledBookings, not instantJobs', () async {
      final listingBooking = BookingModel(
        id: 'listing-bk-1',
        serviceListingId: 'listing-456',
        providerId: 'prov-1',
        customerId: 'cust-1',
        status: 'Requested',
        bookingType: 'Scheduled',
        createdAt: DateTime.now(),
        customerName: 'Saman Perera',
        category: 'Electrical Service',
        scheduledAt: DateTime.now().add(const Duration(days: 2)),
      );

      final instantBooking = BookingModel(
        id: 'instant-bk-1',
        jobRequestId: 'job-req-789',
        providerId: 'prov-1',
        customerId: 'cust-2',
        status: 'Accepted',
        bookingType: 'InstantMatch',
        createdAt: DateTime.now(),
        customerName: 'Nimal Silva',
        category: 'Emergency Plumbing',
      );

      final bookingRepo = MockBookingRepository(
        allBookings: [listingBooking, instantBooking],
        scheduledRequests: [listingBooking],
        apiClient: apiClient,
      );

      final bookingProvider = BookingProvider(repository: bookingRepo);
      await bookingProvider.fetchProviderBookings();

      // Check segregation in BookingProvider getters
      expect(bookingProvider.pendingRequests.length, 1);
      expect(bookingProvider.pendingRequests.first.id, 'listing-bk-1');
      expect(bookingProvider.scheduledBookings.any((b) => b.id == 'listing-bk-1'), isTrue);

      // Verify absence from Instant Match getters
      expect(bookingProvider.instantJobs.any((b) => b.id == 'listing-bk-1'), isFalse);
      expect(bookingProvider.activeInstantJobs.any((b) => b.id == 'listing-bk-1'), isFalse);
      expect(bookingProvider.pastInstantJobs.any((b) => b.id == 'listing-bk-1'), isFalse);
    });

    testWidgets('ProviderJobsScreen renders service listing booking under Scheduled Requests tab and NOT in Instant tab', (tester) async {
      final listingBooking = BookingModel(
        id: 'listing-bk-1',
        serviceListingId: 'listing-456',
        providerId: 'prov-1',
        customerId: 'cust-1',
        status: 'Requested',
        bookingType: 'Scheduled',
        createdAt: DateTime.now(),
        customerName: 'Saman Perera',
        category: 'Electrical Service',
        scheduledAt: DateTime.now().add(const Duration(days: 2)),
      );

      final bookingRepo = MockBookingRepository(
        allBookings: [listingBooking],
        scheduledRequests: [listingBooking],
        apiClient: apiClient,
      );

      final bookingProvider = BookingProvider(repository: bookingRepo);
      await bookingProvider.fetchProviderBookings();

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<BookingProvider>.value(
            value: bookingProvider,
            child: const ProviderJobsScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Default view is Scheduled segment -> Requests tab
      expect(find.text('Scheduled (1)'), findsOneWidget);
      expect(find.text('Instant (0)'), findsOneWidget);
      expect(find.text('Requests (1)'), findsOneWidget);
      expect(find.text('Saman Perera'), findsOneWidget);
      expect(find.text('Electrical Service'), findsOneWidget);

      // Now switch to Instant segment
      await tester.tap(find.text('Instant (0)'));
      await tester.pumpAndSettle();

      // Ensure the listing booking is NOT in the instant tab
      expect(find.text('Active (0)'), findsOneWidget);
      expect(find.text('No active instant jobs in progress.'), findsOneWidget);
      expect(find.text('Saman Perera'), findsNothing);
    });

    test('BookingModel parses PascalCase response keys and correctly categorizes as Scheduled', () {
      final pascalBooking = BookingModel.fromJson({
        'Id': 'pascal-listing-1',
        'ServiceListingId': 'listing-abc',
        'JobRequestId': null,
        'ProviderId': 'prov-1',
        'CustomerId': 'cust-1',
        'Status': 'Requested',
        'ScheduledAt': '2026-10-06T14:00:00Z',
        'CreatedAt': '2026-10-01T12:00:00Z',
        'BookingType': 'Scheduled',
        'CustomerName': 'Kamal Bandara',
        'Category': 'Carpentry',
        'Price': 5500.0,
      });

      expect(pascalBooking.id, 'pascal-listing-1');
      expect(pascalBooking.serviceListingId, 'listing-abc');
      expect(pascalBooking.isScheduled, isTrue);
      expect(pascalBooking.isInstantMatch, isFalse);
      expect(pascalBooking.isRequested, isTrue);
      expect(pascalBooking.customerName, 'Kamal Bandara');
      expect(pascalBooking.category, 'Carpentry');
      expect(pascalBooking.price, 5500.0);
    });

    testWidgets('ProviderJobsScreen renders service listing request card with Accept and Decline, and accepts it', (tester) async {
      final listingBooking = BookingModel(
        id: 'listing-req-accept',
        serviceListingId: 'listing-456',
        providerId: 'prov-1',
        customerId: 'cust-1',
        status: 'Requested',
        bookingType: 'Scheduled',
        createdAt: DateTime.now(),
        customerName: 'Sunil Silva',
        category: 'House Cleaning',
        scheduledAt: DateTime.now().add(const Duration(days: 3)),
        price: 4200.0,
      );

      final bookingRepo = MockBookingRepository(
        allBookings: [listingBooking],
        scheduledRequests: [listingBooking],
        apiClient: apiClient,
      );

      final bookingProvider = BookingProvider(repository: bookingRepo);
      await bookingProvider.fetchProviderBookings();

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<BookingProvider>.value(
            value: bookingProvider,
            child: const ProviderJobsScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Card must be visible in Requests tab
      expect(find.text('House Cleaning'), findsOneWidget);
      expect(find.text('Sunil Silva'), findsOneWidget);
      expect(find.byKey(const Key('accept_booking_listing-req-accept')), findsOneWidget);
      expect(find.byKey(const Key('decline_booking_listing-req-accept')), findsOneWidget);

      // Tap Accept button
      await tester.tap(find.byKey(const Key('accept_booking_listing-req-accept')));
      await tester.pumpAndSettle();

      // Request tab should now be empty and Upcoming tab should have the booking
      expect(bookingProvider.pendingRequests, isEmpty);
      expect(bookingProvider.upcomingScheduledBookings.length, 1);
      expect(bookingProvider.upcomingScheduledBookings.first.id, 'listing-req-accept');
      expect(find.text('Requests (0)'), findsOneWidget);
      expect(find.text('Upcoming (1)'), findsOneWidget);
    });
  });
}
