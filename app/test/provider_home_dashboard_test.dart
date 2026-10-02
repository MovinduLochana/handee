import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/dispatch_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/dispatch_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/screens/provider/provider_home_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('ProviderHomeScreen displays badge on My Jobs and scheduled request banner on Dashboard', (tester) async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'prov-001',
      'user_name': 'Samantha Silva',
      'user_role': 'Provider',
    });
    final storage = await StorageService.getInstance();

    final scheduledBooking = {
      'id': 'book-sched-123',
      'customerId': 'cust-1',
      'customerName': 'Jane Fernando',
      'providerId': 'prov-001',
      'serviceLocation': 'Colombo 03',
      'category': 'Electrical Wiring',
      'description': 'Main breaker panel repair',
      'scheduledAt': DateTime.now().add(const Duration(days: 1)).toIso8601String(),
      'price': 5500.0,
      'status': 'Requested',
      'bookingType': 'Scheduled',
      'expiresAt': DateTime.now().add(const Duration(hours: 20)).toIso8601String(),
      'remainingSeconds': 72000,
      'createdAt': DateTime.now().toIso8601String(),
    };

    final activeBooking = {
      'id': 'book-active-456',
      'customerId': 'cust-2',
      'customerName': 'Kamal Perera',
      'providerId': 'prov-001',
      'serviceLocation': 'Nugegoda, Colombo',
      'category': 'Air Conditioning',
      'description': 'AC cooling leak fix',
      'scheduledAt': DateTime.now().toIso8601String(),
      'price': 8000.0,
      'status': 'InProgress',
      'bookingType': 'Scheduled',
      'createdAt': DateTime.now().toIso8601String(),
    };

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') {
        return http.Response(jsonEncode([scheduledBooking]), 200);
      }
      if (request.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode([activeBooking]), 200);
      }
      if (request.url.path == '/api/provider/instant-offers') {
        return http.Response(jsonEncode([]), 200);
      }
      if (request.url.path == '/api/providers/me') {
        return http.Response(jsonEncode({
          'id': 'prov-001',
          'userId': 'prov-001',
          'fullName': 'Samantha Silva',
          'headline': 'Certified Electrician',
          'verificationStatus': 'Verified',
          'skillCategories': ['Electrical'],
          'yearsOfExperience': 8,
          'hourlyRate': 3500.0,
          'isAvailable': true,
        }), 200);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final bookingRepo = BookingRepository(apiClient: apiClient);
    final dispatchRepo = DispatchRepository(apiClient: apiClient, storage: storage);
    final authRepo = AuthRepository(apiClient: apiClient, storage: storage);
    final providerRepo = ProviderRepository(apiClient: apiClient);
    final listingRepo = ServiceListingRepository(apiClient: apiClient);

    final bookingProvider = BookingProvider(repository: bookingRepo);
    final dispatchProvider = DispatchProvider(repository: dispatchRepo);
    final authProvider = AuthProvider(authRepo: authRepo, storage: storage);
    final dirProvider = ServiceDirectoryProvider(
      providerRepo: providerRepo,
      serviceListingRepo: listingRepo,
    );

    await bookingProvider.fetchProviderBookings();
    await dispatchProvider.fetchOffers();
    await dirProvider.loadMyProviderProfile();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: bookingProvider),
          ChangeNotifierProvider.value(value: dispatchProvider),
          ChangeNotifierProvider.value(value: authProvider),
          ChangeNotifierProvider.value(value: dirProvider),
        ],
        child: const MaterialApp(
          home: ProviderHomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify "My Jobs" bottom navigation item has a badge with count 1
    final myJobsBadgeFinder = find.descendant(
      of: find.byType(BottomNavigationBar),
      matching: find.text('1'),
    );
    expect(myJobsBadgeFinder, findsOneWidget);

    // 2. Verify Dashboard has Scheduled Booking Request banner
    expect(find.textContaining('Scheduled Booking Request'), findsOneWidget);

    // 3. Verify active field assignment uses flat category and description
    expect(find.text('Air Conditioning'), findsOneWidget);
    expect(find.text('AC cooling leak fix'), findsOneWidget);

    // 4. Verify tapping the scheduled banner navigates to ProviderJobsScreen
    await tester.tap(find.textContaining('Scheduled Booking Request'));
    await tester.pumpAndSettle();

    expect(find.text('My Field Assignments'), findsOneWidget);
    expect(find.textContaining('Requests (1)'), findsOneWidget);
  });

  testWidgets('ProviderHomeScreen Online status card renders without overflow on narrow screens', (tester) async {
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.dumpErrorToConsole(details);
    };

    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'prov-001',
      'user_name': 'Samantha Silva',
      'user_role': 'Provider',
    });
    final storage = await StorageService.getInstance();
    final mockClient = MockClient((request) async {
      return http.Response(jsonEncode([]), 200);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final bookingRepo = BookingRepository(apiClient: apiClient);
    final dispatchRepo = DispatchRepository(apiClient: apiClient, storage: storage);
    final authRepo = AuthRepository(apiClient: apiClient, storage: storage);
    final providerRepo = ProviderRepository(apiClient: apiClient);
    final listingRepo = ServiceListingRepository(apiClient: apiClient);

    final bookingProvider = BookingProvider(repository: bookingRepo);
    final dispatchProvider = DispatchProvider(repository: dispatchRepo);
    final authProvider = AuthProvider(authRepo: authRepo, storage: storage);
    final dirProvider = ServiceDirectoryProvider(
      providerRepo: providerRepo,
      serviceListingRepo: listingRepo,
    );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: bookingProvider),
          ChangeNotifierProvider.value(value: dispatchProvider),
          ChangeNotifierProvider.value(value: authProvider),
          ChangeNotifierProvider.value(value: dirProvider),
        ],
        child: const MaterialApp(
          home: ProviderHomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('You are Online'), findsOneWidget);
    expect(find.textContaining('Instant Match Radar Active'), findsOneWidget);
    final exception = tester.takeException();
    expect(exception, isNull);
  });
}

