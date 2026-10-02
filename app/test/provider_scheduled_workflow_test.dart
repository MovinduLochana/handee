import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/constants/api_endpoints.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/providers/booking_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'prov-token',
      'user_id': 'prov-001',
      'user_name': 'Test Provider',
      'user_role': 'Provider',
    });
    storage = await StorageService.getInstance();
  });

  test('BookingRepository getProviderBookingRequests calls ApiEndpoints.providerBookingRequests', () async {
    String? requestedPath;

    final mockClient = MockClient((request) async {
      requestedPath = request.url.path;
      if (request.url.path == ApiEndpoints.providerBookingRequests) {
        return http.Response(
          jsonEncode([
            {
              'id': 'book-scheduled-1',
              'customerId': 'cust-1',
              'customerName': 'Amal Perera',
              'providerId': 'prov-001',
              'providerName': 'Test Provider',
              'serviceLocation': 'Colombo 03',
              'category': 'Carpentry',
              'scheduledAt': DateTime.now().add(const Duration(days: 2)).toIso8601String(),
              'price': 6000.0,
              'status': 'Requested',
              'bookingType': 'Scheduled',
              'expiresAt': DateTime.now().add(const Duration(hours: 22)).toIso8601String(),
              'remainingSeconds': 79200,
              'notes': 'Need kitchen cabinet fixed',
              'createdAt': DateTime.now().toIso8601String(),
            }
          ]),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);

    final requests = await repo.getProviderBookingRequests();
    expect(requestedPath, equals('/api/provider/booking-requests'));
    expect(requests.length, 1);
    expect(requests.first.isScheduled, isTrue);
    expect(requests.first.remainingSeconds, 79200);
    expect(requests.first.notes, 'Need kitchen cabinet fixed');
  });

  test('BookingRepository declineBooking posts reason to ApiEndpoints.declineBooking', () async {
    String? requestedPath;
    String? requestedMethod;
    Map<String, dynamic>? requestedBody;

    final mockClient = MockClient((request) async {
      requestedPath = request.url.path;
      requestedMethod = request.method;
      if (request.url.path == ApiEndpoints.declineBooking('book-scheduled-1')) {
        if (request.body.isNotEmpty) {
          requestedBody = jsonDecode(request.body) as Map<String, dynamic>;
        }
        return http.Response(
          jsonEncode({
            'id': 'book-scheduled-1',
            'status': 'Declined',
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);

    await repo.declineBooking('book-scheduled-1', reason: 'Unavailable on Sunday');
    expect(requestedPath, equals('/api/provider/bookings/book-scheduled-1/decline'));
    expect(requestedMethod, equals('POST'));
    expect(requestedBody?['reason'], equals('Unavailable on Sunday'));
  });

  test('BookingProvider populates pendingRequests and removes on accept / decline', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == ApiEndpoints.providerBookingRequests) {
        return http.Response(
          jsonEncode([
            {
              'id': 'book-sched-99',
              'customerId': 'cust-1',
              'customerName': 'Amal',
              'providerId': 'prov-001',
              'providerName': 'Test Provider',
              'serviceLocation': 'Colombo 03',
              'category': 'Carpentry',
              'scheduledAt': DateTime.now().add(const Duration(days: 2)).toIso8601String(),
              'price': 6000.0,
              'status': 'Requested',
              'bookingType': 'Scheduled',
              'expiresAt': DateTime.now().add(const Duration(hours: 20)).toIso8601String(),
              'remainingSeconds': 72000,
              'notes': 'Fix door hinge',
              'createdAt': DateTime.now().toIso8601String(),
            }
          ]),
          200,
        );
      }
      if (request.url.path == ApiEndpoints.providerBookings) {
        return http.Response(jsonEncode([]), 200);
      }
      if (request.url.path == ApiEndpoints.declineBooking('book-sched-99')) {
        return http.Response(jsonEncode({'status': 'Declined'}), 200);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);
    final provider = BookingProvider(repository: repo);

    await provider.fetchProviderBookings();
    expect(provider.pendingRequests.length, 1);
    expect(provider.pendingRequests.first.id, 'book-sched-99');

    await provider.declineBooking('book-sched-99', reason: 'Busy');
    expect(provider.pendingRequests.isEmpty, isTrue);
  });
}
