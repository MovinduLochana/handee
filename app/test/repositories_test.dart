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
import 'package:app/data/repositories/invoice_repository.dart';
import 'package:app/data/repositories/payment_repository.dart';

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

  test('JobRequestRepository posts serviceCategoryId and parses the real DTO', () async {
    const categoryId = '8a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9';
    Map<String, dynamic>? capturedBody;

    final mockClient = MockClient((request) async {
      if (request.url.path == '/job-requests') {
        capturedBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(
          jsonEncode({
            'id': 'job-req-555',
            'serviceCategoryId': capturedBody!['serviceCategoryId'],
            'categoryName': 'Plumbing',
            'description': capturedBody!['description'],
            'photoUrls': <String>[],
            'location': capturedBody!['location'],
            'urgency': capturedBody!['urgency'],
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
      serviceCategoryId: categoryId,
      description: 'Major leak in bathroom pipe',
      location: 'Colombo 03',
      urgency: 'High',
    );

    // The payload must match CreateJobRequestDto: a real Guid under
    // 'serviceCategoryId', and no legacy 'category' string.
    expect(capturedBody!['serviceCategoryId'], categoryId);
    expect(capturedBody!.containsKey('category'), isFalse);

    expect(result.id, 'job-req-555');
    expect(result.serviceCategoryId, categoryId);
    expect(result.categoryName, 'Plumbing');
    expect(result.status, 'PendingAiReview');
  });

  test('BookingRepository reschedules via PUT /bookings/{id}/schedule', () async {
    final scheduledAt = DateTime.utc(2026, 10, 1, 9, 30);
    Map<String, dynamic>? capturedBody;

    final mockClient = MockClient((request) async {
      if (request.url.path == '/bookings/book-101/schedule' && request.method == 'PUT') {
        capturedBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(
          jsonEncode({
            'id': 'book-101',
            'providerId': 'prov-001',
            'customerId': 'cust-001',
            'status': 'Accepted',
            'scheduledAt': scheduledAt.toIso8601String(),
            'createdAt': DateTime.now().toIso8601String(),
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);

    final updated = await repo.updateBookingSchedule('book-101', scheduledAt);

    expect(capturedBody!.containsKey('scheduledAt'), isTrue);
    expect(updated.scheduledAt, isNotNull);
    expect(updated.scheduledAt!.toUtc(), scheduledAt);
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

  test('InvoiceRepository fetches and deserializes invoice with 85/15 split', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/invoices/booking/book-101') {
        return http.Response(
          jsonEncode({
            'id': 'inv-001',
            'bookingId': 'book-101',
            'customerId': 'cust-001',
            'customerName': 'Kasun Perera',
            'providerId': 'prov-001',
            'providerName': 'Nimal Jayawardena',
            'baseAmount': 2975.0,
            'platformFee': 525.0,
            'totalAmount': 3500.0,
            'currency': 'LKR',
            'status': 'Issued',
            'adminApprovalStatus': 'AutoApproved',
            'createdAt': DateTime.now().toIso8601String(),
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = InvoiceRepository(apiClient: apiClient);

    final invoice = await repo.getInvoiceByBookingId('book-101');
    expect(invoice, isNotNull);
    expect(invoice!.id, 'inv-001');
    expect(invoice.baseAmount, 2975.0);
    expect(invoice.platformFee, 525.0);
    expect(invoice.totalAmount, 3500.0);
    expect(invoice.isIssued, isTrue);
    expect(invoice.isPaid, isFalse);
    expect(invoice.laborPercentage, closeTo(85.0, 0.1));
    expect(invoice.feePercentage, closeTo(15.0, 0.1));
  });

  test('PaymentRepository processes sandbox payment and verifies transaction reference', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/payments') {
        final body = jsonDecode(request.body);
        return http.Response(
          jsonEncode({
            'id': 'pay-999',
            'invoiceId': body['invoiceId'],
            'bookingId': 'book-101',
            'amount': 3500.0,
            'currency': 'LKR',
            'gatewayProvider': body['gatewayProvider'] ?? 'Stripe',
            'transactionReference': 'ch_sbx_mock_abc123',
            'status': 'Succeeded',
            'cardLast4': body['cardLast4'] ?? '4242',
            'createdAt': DateTime.now().toIso8601String(),
            'settledAt': DateTime.now().toIso8601String(),
          }),
          201,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = PaymentRepository(apiClient: apiClient);

    final payment = await repo.processPayment(
      invoiceId: 'inv-001',
      paymentMethod: 'card',
      cardLast4: '4242',
      gatewayProvider: 'Stripe Sandbox',
    );

    expect(payment.id, 'pay-999');
    expect(payment.invoiceId, 'inv-001');
    expect(payment.isSucceeded, isTrue);
    expect(payment.transactionReference, 'ch_sbx_mock_abc123');
    expect(payment.cardLast4, '4242');
  });
}

