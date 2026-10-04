import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/screens/provider/provider_jobs_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('ProviderJobsScreen renders Requests tab with pending booking and Accept/Decline buttons', (tester) async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'prov-001',
      'user_name': 'Provider Bob',
    });
    final storage = await StorageService.getInstance();

    final scheduledBooking = {
      'id': 'book-sched-123',
      'customerId': 'cust-1',
      'customerName': 'Saman Perera',
      'providerId': 'prov-001',
      'providerName': 'Provider Bob',
      'serviceLocation': 'Colombo 05',
      'category': 'Carpentry',
      'scheduledAt': DateTime.now().add(const Duration(days: 2)).toIso8601String(),
      'price': 4500.0,
      'status': 'Requested',
      'bookingType': 'Scheduled',
      'expiresAt': DateTime.now().add(const Duration(hours: 18)).toIso8601String(),
      'remainingSeconds': 64800,
      'notes': 'Please inspect wardrobe hinge',
      'createdAt': DateTime.now().toIso8601String(),
    };

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') {
        return http.Response(jsonEncode([scheduledBooking]), 200);
      }
      if (request.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode([]), 200);
      }
      if (request.url.path == '/bookings/book-sched-123/status') {
        return http.Response(jsonEncode({'status': 'Accepted'}), 200);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);
    final provider = BookingProvider(repository: repo);

    await provider.fetchProviderBookings();

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<BookingProvider>.value(
          value: provider,
          child: const ProviderJobsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Requests tab exists and has count 1
    expect(find.textContaining('Requests (1)'), findsOneWidget);

    // Verify the pending card details
    expect(find.text('Saman Perera'), findsOneWidget);
    expect(find.text('Please inspect wardrobe hinge'), findsOneWidget);
    expect(find.textContaining('Expires in'), findsOneWidget);

    // Verify Accept and Decline buttons are rendered
    expect(find.text('Accept'), findsOneWidget);
    expect(find.text('Decline'), findsOneWidget);

    // Verify clear conflict badge is displayed
    expect(find.text('Slot clear: No conflicting appointments'), findsOneWidget);

    // Tap Accept
    await tester.tap(find.text('Accept'));
    await tester.pumpAndSettle();

    // Request should be accepted and removed from requests
    expect(find.textContaining('Requests (0)'), findsOneWidget);
  });

  testWidgets('ProviderJobsScreen displays direct conflict warning badge when slot overlaps confirmed booking', (tester) async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'prov-001',
      'user_name': 'Provider Bob',
    });
    final storage = await StorageService.getInstance();

    final scheduledTime = DateTime(2026, 10, 5, 14, 0); // 2:00 PM

    final existingBooking = {
      'id': 'book-exist-1',
      'customerId': 'cust-exist',
      'customerName': 'Existing Customer',
      'providerId': 'prov-001',
      'providerName': 'Provider Bob',
      'serviceLocation': 'Colombo 03',
      'category': 'Carpentry',
      'scheduledAt': scheduledTime.toIso8601String(),
      'durationHours': 2,
      'price': 5000.0,
      'status': 'Accepted',
      'bookingType': 'Scheduled',
      'createdAt': DateTime.now().toIso8601String(),
    };

    final incomingRequest = {
      'id': 'book-sched-999',
      'customerId': 'cust-new',
      'customerName': 'New Customer',
      'providerId': 'prov-001',
      'providerName': 'Provider Bob',
      'serviceLocation': 'Colombo 07',
      'category': 'Plumbing',
      'scheduledAt': scheduledTime.add(const Duration(minutes: 30)).toIso8601String(), // 2:30 PM (overlaps!)
      'durationHours': 1,
      'price': 4000.0,
      'status': 'Requested',
      'bookingType': 'Scheduled',
      'expiresAt': DateTime.now().add(const Duration(hours: 12)).toIso8601String(),
      'remainingSeconds': 43200,
      'createdAt': DateTime.now().toIso8601String(),
    };

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') {
        return http.Response(jsonEncode([incomingRequest]), 200);
      }
      if (request.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode([existingBooking]), 200);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);
    final provider = BookingProvider(repository: repo);

    await provider.fetchProviderBookings();

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<BookingProvider>.value(
          value: provider,
          child: const ProviderJobsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify direct overlap warning is displayed
    expect(find.textContaining('Overlaps with'), findsOneWidget);
    expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
  });

  testWidgets('ProviderJobsScreen displays tight schedule warning badge when slot is close to confirmed booking', (tester) async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'prov-001',
      'user_name': 'Provider Bob',
    });
    final storage = await StorageService.getInstance();

    final baseTime = DateTime(2026, 10, 5, 10, 0); // 10:00 AM

    final existingBooking = {
      'id': 'book-exist-2',
      'customerId': 'cust-exist',
      'customerName': 'Existing Customer',
      'providerId': 'prov-001',
      'providerName': 'Provider Bob',
      'serviceLocation': 'Colombo 03',
      'category': 'Carpentry',
      'scheduledAt': baseTime.toIso8601String(),
      'durationHours': 1, // ends at 11:00 AM
      'price': 5000.0,
      'status': 'Accepted',
      'bookingType': 'Scheduled',
      'createdAt': DateTime.now().toIso8601String(),
    };

    final incomingRequest = {
      'id': 'book-sched-888',
      'customerId': 'cust-new',
      'customerName': 'New Customer',
      'providerId': 'prov-001',
      'providerName': 'Provider Bob',
      'serviceLocation': 'Colombo 07',
      'category': 'Plumbing',
      'scheduledAt': baseTime.add(const Duration(minutes: 90)).toIso8601String(), // 11:30 AM (30 min gap after 11:00 AM)
      'durationHours': 1,
      'price': 4000.0,
      'status': 'Requested',
      'bookingType': 'Scheduled',
      'expiresAt': DateTime.now().add(const Duration(hours: 12)).toIso8601String(),
      'remainingSeconds': 43200,
      'createdAt': DateTime.now().toIso8601String(),
    };

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') {
        return http.Response(jsonEncode([incomingRequest]), 200);
      }
      if (request.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode([existingBooking]), 200);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);
    final provider = BookingProvider(repository: repo);

    await provider.fetchProviderBookings();

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<BookingProvider>.value(
          value: provider,
          child: const ProviderJobsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify tight schedule warning is displayed
    expect(find.textContaining('Tight schedule: 30 min gap'), findsOneWidget);
    expect(find.byIcon(Icons.timelapse), findsOneWidget);
  });

  testWidgets('ProviderJobsScreen warns on schedule conflict before acceptance and respects cancellation', (tester) async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'prov-001',
      'user_name': 'Provider Bob',
    });
    final storage = await StorageService.getInstance();

    final scheduledTime = DateTime(2026, 10, 5, 14, 0);

    final existingBooking = {
      'id': 'book-exist-1',
      'customerId': 'cust-exist',
      'customerName': 'Existing Customer',
      'providerId': 'prov-001',
      'providerName': 'Provider Bob',
      'serviceLocation': 'Colombo 03',
      'category': 'Carpentry',
      'scheduledAt': scheduledTime.toIso8601String(),
      'durationHours': 2,
      'price': 5000.0,
      'status': 'Accepted',
      'bookingType': 'Scheduled',
      'createdAt': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
    };

    final conflictingRequest = {
      'id': 'book-conflict-1',
      'customerId': 'cust-conflicting',
      'customerName': 'Conflicting Customer',
      'providerId': 'prov-001',
      'providerName': 'Provider Bob',
      'serviceLocation': 'Colombo 04',
      'category': 'Carpentry Repair',
      'scheduledAt': scheduledTime.add(const Duration(minutes: 30)).toIso8601String(),
      'durationHours': 2,
      'price': 6000.0,
      'status': 'Requested',
      'bookingType': 'Scheduled',
      'expiresAt': DateTime.now().add(const Duration(hours: 10)).toIso8601String(),
      'remainingSeconds': 36000,
      'createdAt': DateTime.now().toIso8601String(),
    };

    bool acceptEndpointCalled = false;

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') {
        return http.Response(jsonEncode([conflictingRequest]), 200);
      }
      if (request.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode([existingBooking]), 200);
      }
      if (request.url.path == '/api/provider/bookings/book-conflict-1/confirm' ||
          (request.url.path == '/bookings/book-conflict-1/status' && request.method == 'PUT')) {
        acceptEndpointCalled = true;
        return http.Response(jsonEncode(conflictingRequest..['status'] = 'Accepted'), 200);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);
    final provider = BookingProvider(repository: repo);

    await provider.fetchProviderBookings();

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<BookingProvider>.value(
          value: provider,
          child: const ProviderJobsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Tap Accept on the conflicting booking
    await tester.tap(find.text('Accept'));
    await tester.pumpAndSettle();

    // Verify Schedule Conflict Detected dialog is shown
    expect(find.text('Schedule Conflict Detected'), findsOneWidget);
    expect(find.textContaining('Accepting this appointment will create a double-booking'), findsOneWidget);

    // Tap Cancel in the dialog
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    // Verify booking was NOT accepted
    expect(acceptEndpointCalled, isFalse);
    expect(find.text('Schedule Conflict Detected'), findsNothing);
    expect(find.textContaining('Requests (1)'), findsOneWidget);

    // Tap Accept again and this time tap 'Accept Anyway'
    await tester.tap(find.text('Accept'));
    await tester.pumpAndSettle();
    expect(find.text('Schedule Conflict Detected'), findsOneWidget);

    await tester.tap(find.text('Accept Anyway'));
    await tester.pumpAndSettle();

    expect(acceptEndpointCalled, isTrue);
    expect(find.textContaining('Booking accepted for Conflicting Customer!'), findsOneWidget);
  });
}
