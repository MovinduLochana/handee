import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/job_request_repository.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/assistant_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-access-token',
      'user_id': 'cust-001',
      'user_name': 'Test Customer',
      'user_role': 'Customer',
    });
    storage = await StorageService.getInstance();
  });

  test('AuthRepository login deserializes tokens and user profile', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/auth/login') {
        return http.Response(
          jsonEncode({
            'accessToken': 'jwt-abc-123',
            'refreshToken': 'ref-xyz-456',
            'userId': 'usr-789',
            'fullName': 'Kasun Perera',
          }),
          200,
        );
      }
      if (request.url.path == '/users/me') {
        return http.Response(
          jsonEncode({
            'id': 'usr-789',
            'email': 'kasun@example.com',
            'fullName': 'Kasun Perera',
            'role': 'Customer',
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final authRepo = AuthRepository(apiClient: apiClient, storage: storage);

    final user = await authRepo.login(email: 'kasun@example.com', password: 'Password@123');
    expect(user.fullName, 'Kasun Perera');
    expect(user.email, 'kasun@example.com');
    expect(storage.getAccessToken(), 'jwt-abc-123');
  });

  test('JobRequestRepository creates request against real backend API', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/job-requests') {
        final body = jsonDecode(request.body);
        return http.Response(
          jsonEncode({
            'id': 'job-req-555',
            'category': body['category'],
            'description': body['description'],
            'location': body['location'],
            'urgency': body['urgency'],
            'status': 'PendingAiReview',
            'customerId': 'cust-001',
            'createdAt': DateTime.now().toIso8601String(),
          }),
          201,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = JobRequestRepository(apiClient: apiClient, storage: storage);

    final result = await repo.createJobRequest(
      category: 'Plumbing',
      description: 'Major leak in bathroom pipe',
      location: 'Colombo 03',
      urgency: 'High',
    );

    expect(result.id, 'job-req-555');
    expect(result.category, 'Plumbing');
    expect(result.status, 'PendingAiReview');
  });

  test('BookingRepository fetches and updates booking status', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/bookings/mine') {
        return http.Response(
          jsonEncode([
            {
              'id': 'book-101',
              'providerId': 'prov-001',
              'customerId': 'cust-001',
              'status': 'Accepted',
              'createdAt': DateTime.now().toIso8601String(),
              'customerName': 'Test Customer',
              'serviceLocation': 'Colombo 03',
              'price': 4500.0,
            }
          ]),
          200,
        );
      }
      if (request.url.path == '/bookings/book-101/status') {
        return http.Response(
          jsonEncode({
            'id': 'book-101',
            'providerId': 'prov-001',
            'customerId': 'cust-001',
            'status': 'InProgress',
            'createdAt': DateTime.now().toIso8601String(),
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);

    final bookings = await repo.getCustomerBookings();
    expect(bookings.length, 1);
    expect(bookings.first.status, 'Accepted');

    final updated = await repo.updateBookingStatus('book-101', 'InProgress');
    expect(updated.status, 'InProgress');
  });

  test('AssistantRepository queries backend AI assistant endpoint', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/assistant/query') {
        return http.Response(
          jsonEncode({
            'reply': 'I found 3 verified AC specialists in Colombo.',
            'suggestions': ['Book AC Servicing', 'View AC Pricing Guide'],
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = AssistantRepository(apiClient: apiClient);

    final reply = await repo.queryAssistant('Need AC cleaning');
    expect(reply.text, contains('verified AC specialists'));
    expect(reply.suggestions.length, 2);
  });
}
