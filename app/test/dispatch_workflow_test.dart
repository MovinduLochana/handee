import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/constants/api_endpoints.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/repositories/dispatch_repository.dart';
import 'package:app/providers/dispatch_provider.dart';

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

  test('DispatchRepository calls ApiEndpoints.providerInstantOffers and deserializes TTL', () async {
    String? requestedPath;

    final mockClient = MockClient((request) async {
      requestedPath = request.url.path;
      if (request.url.path == ApiEndpoints.providerInstantOffers) {
        return http.Response(
          jsonEncode([
            {
              'id': 'book-instant-1',
              'customerId': 'cust-1',
              'customerName': 'Amal Silva',
              'providerId': 'prov-001',
              'providerName': 'Test Provider',
              'serviceLocation': 'Colombo 07',
              'categoryName': 'Electrical',
              'scheduledAt': DateTime.now().toIso8601String(),
              'price': 4500.0,
              'status': 'Requested',
              'bookingType': 'InstantMatch',
              'expiresAt': DateTime.now().add(const Duration(seconds: 88)).toIso8601String(),
              'remainingSeconds': 88,
              'createdAt': DateTime.now().toIso8601String(),
            }
          ]),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = DispatchRepository(apiClient: apiClient, storage: storage);

    final offers = await repo.getIncomingOffers();
    expect(requestedPath, equals('/api/provider/instant-offers'));
    expect(offers.length, 1);
    expect(offers.first.isInstantMatch, isTrue);
    expect(offers.first.remainingSeconds, 88);
  });

  test('DispatchRepository declineOffer updates status to Declined', () async {
    String? requestedPath;
    Map<String, dynamic>? requestedBody;

    final mockClient = MockClient((request) async {
      requestedPath = request.url.path;
      if (request.method == 'PUT' && request.url.path == '/bookings/book-instant-1/status') {
        requestedBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(jsonEncode({'status': 'Declined'}), 200);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = DispatchRepository(apiClient: apiClient, storage: storage);

    await repo.declineOffer('book-instant-1');
    expect(requestedPath, '/bookings/book-instant-1/status');
    expect(requestedBody?['status'], 'Declined');
  });

  test('DispatchProvider uses remainingSeconds from offer for countdown countdownSeconds', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == ApiEndpoints.providerInstantOffers) {
        return http.Response(
          jsonEncode([
            {
              'id': 'book-instant-2',
              'customerId': 'cust-2',
              'customerName': 'Nimal',
              'providerId': 'prov-001',
              'providerName': 'Test Provider',
              'serviceLocation': 'Kandy',
              'categoryName': 'Plumbing',
              'scheduledAt': DateTime.now().toIso8601String(),
              'price': 3000.0,
              'status': 'Requested',
              'bookingType': 'InstantMatch',
              'expiresAt': DateTime.now().add(const Duration(seconds: 75)).toIso8601String(),
              'remainingSeconds': 75,
              'createdAt': DateTime.now().toIso8601String(),
            }
          ]),
          200,
        );
      }
      if (request.url.path == '/api/providers/me') {
        return http.Response(
          jsonEncode({
            'id': 'prov-001',
            'userId': 'prov-001',
            'fullName': 'Test Provider',
            'isOnline': true,
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = DispatchRepository(apiClient: apiClient, storage: storage);
    final provider = DispatchProvider(repository: repo);

    await provider.fetchOffers();
    expect(provider.countdownSeconds, 75);
    provider.dispose();
  });

  test('DispatchProvider addIncomingOffer initiates countdown and exposes hasActiveIncomingOffer', () async {
    final mockClient = MockClient((request) async {
      return http.Response(jsonEncode([]), 200);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = DispatchRepository(apiClient: apiClient, storage: storage);
    final provider = DispatchProvider(repository: repo);

    expect(provider.hasActiveIncomingOffer, isFalse);

    final offer = BookingModel(
      id: 'offer-signalr-1',
      providerId: 'prov-001',
      customerId: 'cust-99',
      status: 'Requested',
      bookingType: 'InstantMatch',
      remainingSeconds: 85,
      createdAt: DateTime.now(),
    );

    provider.addIncomingOffer(offer);

    expect(provider.hasActiveIncomingOffer, isTrue);
    expect(provider.incomingOffers.length, 1);
    expect(provider.countdownSeconds, 85);

    provider.dispose();
  });
}
