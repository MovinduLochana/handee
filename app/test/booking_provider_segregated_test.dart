import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/providers/booking_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('BookingProvider segregated getters correctly segment instant jobs from scheduled bookings and fix active duplication', () async {
    SharedPreferences.setMockInitialValues({'auth_access_token': 'token'});
    final storage = await StorageService.getInstance();

    final now = DateTime(2026, 10, 1, 10, 0);

    final mockBookings = [
      // 1. Instant Active: InProgress
      {
        'id': 'inst-active-1',
        'providerId': 'prov-1',
        'customerId': 'cust-1',
        'status': 'InProgress',
        'bookingType': 'InstantMatch',
        'jobRequestId': 'req-1',
        'createdAt': now.subtract(const Duration(minutes: 30)).toIso8601String(),
      },
      // 2. Instant Past: Completed
      {
        'id': 'inst-past-1',
        'providerId': 'prov-1',
        'customerId': 'cust-2',
        'status': 'Completed',
        'bookingType': 'InstantMatch',
        'jobRequestId': 'req-2',
        'createdAt': now.subtract(const Duration(days: 1)).toIso8601String(),
      },
      // 3. Scheduled Upcoming: Earlier appointment (Oct 2)
      {
        'id': 'sched-up-early',
        'providerId': 'prov-1',
        'customerId': 'cust-3',
        'status': 'Accepted',
        'bookingType': 'Scheduled',
        'serviceListingId': 'list-1',
        'scheduledAt': now.add(const Duration(days: 1)).toIso8601String(),
        'createdAt': now.subtract(const Duration(hours: 2)).toIso8601String(),
      },
      // 4. Scheduled Upcoming: Later appointment (Oct 4)
      {
        'id': 'sched-up-later',
        'providerId': 'prov-1',
        'customerId': 'cust-4',
        'status': 'Accepted',
        'bookingType': 'Scheduled',
        'serviceListingId': 'list-2',
        'scheduledAt': now.add(const Duration(days: 3)).toIso8601String(),
        'createdAt': now.subtract(const Duration(hours: 1)).toIso8601String(),
      },
      // 5. Scheduled Past: Completed
      {
        'id': 'sched-past-1',
        'providerId': 'prov-1',
        'customerId': 'cust-5',
        'status': 'Completed',
        'bookingType': 'Scheduled',
        'serviceListingId': 'list-3',
        'scheduledAt': now.subtract(const Duration(days: 2)).toIso8601String(),
        'createdAt': now.subtract(const Duration(days: 3)).toIso8601String(),
      },
      // 6. Scheduled Requested (Pending Review) - should NOT duplicate into activeBookings
      {
        'id': 'sched-req-1',
        'providerId': 'prov-1',
        'customerId': 'cust-6',
        'status': 'Requested',
        'bookingType': 'Scheduled',
        'serviceListingId': 'list-4',
        'scheduledAt': now.add(const Duration(days: 5)).toIso8601String(),
        'createdAt': now.toIso8601String(),
      },
    ];

    final mockPendingRequests = [
      {
        'id': 'sched-req-1',
        'providerId': 'prov-1',
        'customerId': 'cust-6',
        'status': 'Requested',
        'bookingType': 'Scheduled',
        'serviceListingId': 'list-4',
        'scheduledAt': now.add(const Duration(days: 5)).toIso8601String(),
        'createdAt': now.toIso8601String(),
      },
    ];

    final mockClient = MockClient((req) async {
      if (req.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode(mockBookings), 200);
      }
      if (req.url.path == '/api/provider/booking-requests') {
        return http.Response(jsonEncode(mockPendingRequests), 200);
      }
      return http.Response('[]', 200);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);
    final provider = BookingProvider(repository: repo);

    await provider.fetchProviderBookings();

    // 1. Verify Active Bookings bug fix: activeBookings excludes Requested
    expect(provider.activeBookings.length, equals(3));
    expect(provider.activeBookings.any((b) => b.isRequested), isFalse);

    // 2. Verify Instant Match Domain getters
    expect(provider.instantJobs.length, equals(2));
    expect(provider.activeInstantJobs.length, equals(1));
    expect(provider.activeInstantJobs.first.id, equals('inst-active-1'));
    expect(provider.pastInstantJobs.length, equals(1));
    expect(provider.pastInstantJobs.first.id, equals('inst-past-1'));

    // 3. Verify Scheduled Bookings Domain getters
    expect(provider.scheduledBookings.length, equals(4));
    expect(provider.pendingRequests.length, equals(1));
    expect(provider.pendingRequests.first.id, equals('sched-req-1'));

    // 4. Verify Upcoming Scheduled Bookings sorting (earliest scheduledAt first)
    expect(provider.upcomingScheduledBookings.length, equals(2));
    expect(provider.upcomingScheduledBookings.first.id, equals('sched-up-early'));
    expect(provider.upcomingScheduledBookings.last.id, equals('sched-up-later'));

    // 5. Verify Past Scheduled Bookings
    expect(provider.pastScheduledBookings.length, equals(1));
    expect(provider.pastScheduledBookings.first.id, equals('sched-past-1'));

    // 6. Verify count getters
    expect(provider.activeInstantCount, equals(1));
    expect(provider.pendingScheduledCount, equals(1));
    expect(provider.upcomingScheduledCount, equals(2));
  });

  test('BookingProvider.acceptBooking moves booking from pendingRequests into upcomingScheduledBookings even if item originated from booking-requests only', () async {
    SharedPreferences.setMockInitialValues({'auth_access_token': 'token'});
    final storage = await StorageService.getInstance();

    final now = DateTime(2026, 10, 1, 10, 0);

    final mockBookings = <Map<String, dynamic>>[]; // initially empty from provider-mine
    final mockPendingRequests = [
      {
        'id': 'sched-req-isolated',
        'providerId': 'prov-1',
        'customerId': 'cust-10',
        'customerName': 'Amal Fernando',
        'status': 'Requested',
        'bookingType': 'Scheduled',
        'serviceListingId': 'list-10',
        'scheduledAt': now.add(const Duration(days: 2)).toIso8601String(),
        'createdAt': now.toIso8601String(),
      },
    ];

    final acceptedBooking = {
      'id': 'sched-req-isolated',
      'providerId': 'prov-1',
      'customerId': 'cust-10',
      'customerName': 'Amal Fernando',
      'status': 'Accepted',
      'bookingType': 'Scheduled',
      'serviceListingId': 'list-10',
      'scheduledAt': now.add(const Duration(days: 2)).toIso8601String(),
      'createdAt': now.toIso8601String(),
    };

    final mockClient = MockClient((req) async {
      if (req.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode(mockBookings), 200);
      }
      if (req.url.path == '/api/provider/booking-requests') {
        return http.Response(jsonEncode(mockPendingRequests), 200);
      }
      if (req.url.path == '/api/provider/bookings/sched-req-isolated/confirm' ||
          (req.url.path == '/bookings/sched-req-isolated/status' && req.method == 'PUT')) {
        return http.Response(jsonEncode(acceptedBooking), 200);
      }
      return http.Response('[]', 200);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);
    final provider = BookingProvider(repository: repo);

    await provider.fetchProviderBookings();

    expect(provider.pendingRequests.length, equals(1));
    expect(provider.upcomingScheduledBookings.length, equals(0));

    final success = await provider.acceptBooking('sched-req-isolated');
    expect(success, isTrue);

    // After acceptance, pendingRequests must be empty and upcomingScheduledBookings must contain the accepted booking
    expect(provider.pendingRequests.length, equals(0));
    expect(provider.upcomingScheduledBookings.length, equals(1));
    expect(provider.upcomingScheduledBookings.first.id, equals('sched-req-isolated'));
    expect(provider.upcomingScheduledBookings.first.isAccepted, isTrue);
  });
}
