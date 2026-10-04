import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/core/utils/external_launcher_helper.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/dispatch_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/dispatch_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/screens/provider/active_job_screen.dart';
import 'package:app/screens/provider/provider_home_screen.dart';
import 'package:app/screens/provider/provider_jobs_screen.dart';
import 'package:app/core/theme/app_theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ExternalLauncherHelper.urlLauncherOverride = null;
  });

  group('ExternalLauncherHelper - Phone Calls', () {
    testWidgets('formats valid phone number and invokes urlLauncher with tel: scheme', (tester) async {
      Uri? capturedUri;
      LaunchMode? capturedMode;

      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        capturedUri = uri;
        capturedMode = mode;
        return true;
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ExternalLauncherHelper.launchPhoneCall(context, '+94 (77) 123-4567'),
                child: const Text('Call'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Call'));
      await tester.pumpAndSettle();

      expect(capturedUri, isNotNull);
      expect(capturedUri.toString(), equals('tel:+94771234567'));
      expect(capturedMode, equals(LaunchMode.externalApplication));
    });

    testWidgets('shows snackbar when phone is null or empty', (tester) async {
      int launchCallCount = 0;
      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        launchCallCount++;
        return true;
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ExternalLauncherHelper.launchPhoneCall(context, null),
                child: const Text('Call'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Call'));
      await tester.pumpAndSettle();

      expect(launchCallCount, equals(0));
      expect(find.text('Customer phone number is not available'), findsOneWidget);
    });

    testWidgets('shows snackbar when launcher returns false (dialer unavailable)', (tester) async {
      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        return false;
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ExternalLauncherHelper.launchPhoneCall(context, '0771234567'),
                child: const Text('Call'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Call'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Could not open dialer for 0771234567'), findsOneWidget);
    });
  });

  group('ExternalLauncherHelper - Map Navigation', () {
    testWidgets('encodes address query and invokes urlLauncher with Google Maps URL', (tester) async {
      Uri? capturedUri;
      LaunchMode? capturedMode;

      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        capturedUri = uri;
        capturedMode = mode;
        return true;
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ExternalLauncherHelper.launchMapNavigation(context, 'No. 42, Flower Road, Colombo 07'),
                child: const Text('Navigate'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Navigate'));
      await tester.pumpAndSettle();

      expect(capturedUri, isNotNull);
      expect(
        capturedUri.toString(),
        equals('https://www.google.com/maps/search/?api=1&query=No.%2042%2C%20Flower%20Road%2C%20Colombo%2007'),
      );
      expect(capturedMode, equals(LaunchMode.externalApplication));
    });

    testWidgets('launchMapNavigation prioritizes exact coordinates over address query for pin-point directions', (tester) async {
      Uri? capturedUri;
      LaunchMode? capturedMode;

      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        capturedUri = uri;
        capturedMode = mode;
        return true;
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ExternalLauncherHelper.launchMapNavigation(
                  context,
                  'No. 42, Temple Road',
                  latitude: 6.9056,
                  longitude: 79.8622,
                ),
                child: const Text('Navigate Coords'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Navigate Coords'));
      await tester.pumpAndSettle();

      expect(capturedUri, isNotNull);
      expect(
        capturedUri.toString(),
        equals('https://www.google.com/maps/search/?api=1&query=6.9056,79.8622'),
      );
      expect(capturedMode, equals(LaunchMode.externalApplication));
    });

    testWidgets('shows snackbar when address is null or empty', (tester) async {
      int launchCallCount = 0;
      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        launchCallCount++;
        return true;
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ExternalLauncherHelper.launchMapNavigation(context, '   '),
                child: const Text('Navigate'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Navigate'));
      await tester.pumpAndSettle();

      expect(launchCallCount, equals(0));
      expect(find.text('Service location is not specified'), findsOneWidget);
    });

    testWidgets('shows snackbar when launcher returns false (no map provider available)', (tester) async {
      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        return false;
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ExternalLauncherHelper.launchMapNavigation(context, 'Galle Face Green'),
                child: const Text('Navigate'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Navigate'));
      await tester.pumpAndSettle();

      expect(find.text('Could not open map navigation application'), findsOneWidget);
    });
  });

  group('UI Shortcut Invocations', () {
    testWidgets('ActiveJobScreen call and directions buttons trigger external launchers', (tester) async {
      SharedPreferences.setMockInitialValues({'auth_access_token': 'token'});
      final storage = await StorageService.getInstance();
      final mockClient = MockClient((_) async => http.Response('[]', 200));
      final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
      final bookingRepo = BookingRepository(apiClient: apiClient);
      final bookingProvider = BookingProvider(repository: bookingRepo);

      final booking = BookingModel(
        id: 'book-active-1',
        providerId: 'prov-1',
        customerId: 'cust-1',
        customerName: 'Anura Bandara',
        customerPhone: '+94 71 999 8888',
        serviceLocation: 'Kandy Road, Kiribathgoda',
        status: 'Accepted',
        createdAt: DateTime.now(),
      );

      Uri? capturedUri;
      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        capturedUri = uri;
        return true;
      };

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<BookingProvider>.value(
            value: bookingProvider,
            child: ActiveJobScreen(booking: booking),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 1. Tap call button
      final callBtn = find.byKey(const Key('active_job_call_button'));
      expect(callBtn, findsOneWidget);
      await tester.tap(callBtn);
      await tester.pumpAndSettle();

      expect(capturedUri, isNotNull);
      expect(capturedUri.toString(), equals('tel:+94719998888'));

      // 2. Tap directions button
      final navBtn = find.byKey(const Key('active_job_navigate_button'));
      expect(navBtn, findsOneWidget);
      await tester.tap(navBtn);
      await tester.pumpAndSettle();

      expect(capturedUri.toString(), contains('https://www.google.com/maps/search/?api=1&query=Kandy%20Road'));
    });

    testWidgets('ProviderJobsScreen request card launches phone call when tapping customer phone', (tester) async {
      SharedPreferences.setMockInitialValues({
        'auth_access_token': 'token',
        'user_id': 'prov-1',
      });
      final storage = await StorageService.getInstance();

      final requestData = {
        'id': 'book-req-555',
        'customerId': 'cust-55',
        'customerName': 'Dilshan Dias',
        'customerPhone': '+94 77 555 4444',
        'providerId': 'prov-1',
        'serviceLocation': 'Negombo Road, Wattala',
        'category': 'Carpentry',
        'status': 'Requested',
        'bookingType': 'Scheduled',
        'scheduledAt': DateTime.now().add(const Duration(days: 2)).toIso8601String(),
        'createdAt': DateTime.now().toIso8601String(),
      };

      final mockClient = MockClient((req) async {
        if (req.url.path == '/api/provider/booking-requests') {
          return http.Response(jsonEncode([requestData]), 200);
        }
        return http.Response('[]', 200);
      });

      final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
      final repo = BookingRepository(apiClient: apiClient);
      final provider = BookingProvider(repository: repo);

      await provider.fetchProviderBookings();

      Uri? capturedUri;
      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        capturedUri = uri;
        return true;
      };

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<BookingProvider>.value(
            value: provider,
            child: const ProviderJobsScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final phoneChip = find.byKey(const Key('call_customer_book-req-555'));
      expect(phoneChip, findsOneWidget);

      await tester.tap(phoneChip);
      await tester.pumpAndSettle();

      expect(capturedUri.toString(), equals('tel:+94775554444'));

      final mapChip = find.byKey(const Key('navigate_customer_book-req-555'));
      expect(mapChip, findsOneWidget);

      await tester.tap(mapChip);
      await tester.pumpAndSettle();

      expect(capturedUri.toString(), contains('https://www.google.com/maps/search/?api=1&query=Negombo%20Road'));
    });

    testWidgets('ProviderHomeScreen dashboard Directions button launches map navigation for active job', (tester) async {
      SharedPreferences.setMockInitialValues({
        'auth_access_token': 'token',
        'user_id': 'prov-1',
        'user_role': 'Provider',
      });
      final storage = await StorageService.getInstance();

      final activeBooking = {
        'id': 'book-act-99',
        'customerId': 'cust-99',
        'customerName': 'Rohan De Silva',
        'providerId': 'prov-1',
        'serviceLocation': 'Havelock Town, Colombo 05',
        'category': 'Plumbing',
        'status': 'InProgress',
        'bookingType': 'Scheduled',
        'createdAt': DateTime.now().toIso8601String(),
      };

      final mockClient = MockClient((req) async {
        if (req.url.path == '/bookings/provider-mine') {
          return http.Response(jsonEncode([activeBooking]), 200);
        }
        if (req.url.path == '/api/providers/me') {
          return http.Response(jsonEncode({
            'id': 'prov-1',
            'userId': 'prov-1',
            'fullName': 'Provider Bob',
            'verificationStatus': 'Verified',
            'isAvailable': true,
          }), 200);
        }
        return http.Response('[]', 200);
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
      final serviceDirProvider = ServiceDirectoryProvider(
        providerRepo: providerRepo,
        serviceListingRepo: listingRepo,
      );

      Uri? capturedUri;
      ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
        capturedUri = uri;
        return true;
      };

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
            ChangeNotifierProvider<DispatchProvider>.value(value: dispatchProvider),
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<ServiceDirectoryProvider>.value(value: serviceDirProvider),
          ],
          child: const MaterialApp(
            home: ProviderHomeScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final directionsBtn = find.byKey(const Key('dashboard_navigate_button'));
      expect(directionsBtn, findsOneWidget);

      await tester.tap(directionsBtn);
      await tester.pumpAndSettle();

      expect(capturedUri.toString(), contains('https://www.google.com/maps/search/?api=1&query=Havelock%20Town'));
    });
  });

  group('ProviderJobsScreen - Layout and Dialogs with AppTheme', () {
    testWidgets('renders request card and decline dialog with TextField without BoxConstraints forces an infinite width', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.getInstance();

      final pendingBooking = BookingModel(
        id: 'test-req-101',
        serviceListingId: 'listing-101',
        providerId: 'prov-1',
        customerId: 'cust-1',
        status: 'Requested',
        bookingType: 'Scheduled',
        category: 'Plumbing Repair',
        scheduledAt: DateTime.now().add(const Duration(days: 1)),
        customerName: 'Nimal Silva',
        customerPhone: '+94771112233',
        price: 3500.0,
        createdAt: DateTime.now(),
      );

      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/bookings/provider-requests') ||
            request.url.path.contains('/api/provider/booking-requests')) {
          return http.Response(jsonEncode([pendingBooking.toJson()]), 200);
        }
        if (request.url.path.contains('/bookings/provider-mine')) {
          return http.Response(jsonEncode([pendingBooking.toJson()]), 200);
        }
        if (request.url.path.contains('/bookings/provider-offers')) {
          return http.Response('[]', 200);
        }
        if (request.url.path.contains('/status')) {
          return http.Response(jsonEncode(pendingBooking.copyWith(status: 'Cancelled').toJson()), 200);
        }
        return http.Response('[]', 200);
      });

      final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
      final bookingRepo = BookingRepository(apiClient: apiClient);
      final bookingProvider = BookingProvider(repository: bookingRepo);
      await bookingProvider.fetchProviderBookings();

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.lightTheme,
          home: ChangeNotifierProvider<BookingProvider>.value(
            value: bookingProvider,
            child: const ProviderJobsScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Assert no layout or box constraints exceptions were thrown during render
      expect(tester.takeException(), isNull);
      expect(find.text('Plumbing Repair'), findsOneWidget);
      expect(find.text('Nimal Silva'), findsOneWidget);
      expect(find.byKey(const Key('decline_booking_test-req-101')), findsOneWidget);
      expect(find.byKey(const Key('accept_booking_test-req-101')), findsOneWidget);

      // Tap Decline to show the AlertDialog with TextField
      await tester.tap(find.byKey(const Key('decline_booking_test-req-101')));
      await tester.pumpAndSettle();

      // Assert the AlertDialog rendered cleanly without throwing BoxConstraints forces an infinite width
      expect(tester.takeException(), isNull);
      expect(find.text('Decline Booking Request'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);

      // Enter text into the reason TextField
      await tester.enterText(find.byType(TextField), 'Unavailable at this time');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      // Cancel dialog to dismiss
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Decline Booking Request'), findsNothing);
    });
  });
}
