import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/review_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-access-token',
      'user_id': 'cust-001',
    });
    storage = await StorageService.getInstance();
  });

  test('ReviewRepository.getReviewsForProvider queries provider reviews endpoint and parses paged results', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/providers/prov-999/reviews') {
        expect(request.url.queryParameters['page'], '1');
        expect(request.url.queryParameters['pageSize'], '5');
        return http.Response(
          jsonEncode({
            'items': [
              {
                'id': 'rev-001',
                'providerProfileId': 'prov-999',
                'customerId': 'cust-001',
                'customerName': 'Amara Silva',
                'rating': 5,
                'comment': 'Fast and friendly technician',
                'photoUrls': ['https://cdn.handee.lk/rev1.jpg'],
                'createdAt': '2026-10-02T12:00:00Z',
              }
            ],
            'totalCount': 1,
            'page': 1,
            'pageSize': 5,
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final reviewRepo = ReviewRepository(apiClient: apiClient);

    final result = await reviewRepo.getReviewsForProvider(
      providerId: 'prov-999',
      page: 1,
      pageSize: 5,
    );

    expect(result.totalCount, 1);
    expect(result.items.length, 1);
    expect(result.items.first.id, 'rev-001');
    expect(result.items.first.customerName, 'Amara Silva');
    expect(result.items.first.rating, 5);
    expect(result.items.first.comment, 'Fast and friendly technician');
  });

  test('ReviewRepository.addReview posts review payload and returns created ReviewModel', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/providers/prov-999/reviews' && request.method == 'POST') {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['rating'], 5);
        expect(body['comment'], 'Excellent work on the sink');

        return http.Response(
          jsonEncode({
            'id': 'rev-new-123',
            'providerProfileId': 'prov-999',
            'customerId': 'cust-001',
            'customerName': 'Test Customer',
            'rating': 5,
            'comment': 'Excellent work on the sink',
            'photoUrls': [],
            'createdAt': '2026-10-05T10:00:00Z',
          }),
          201,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final reviewRepo = ReviewRepository(apiClient: apiClient);

    final created = await reviewRepo.addReview(
      providerId: 'prov-999',
      rating: 5,
      comment: 'Excellent work on the sink',
    );

    expect(created.id, 'rev-new-123');
    expect(created.rating, 5);
    expect(created.comment, 'Excellent work on the sink');
  });

  test('ReviewRepository.addReview throws exception on 409 Conflict', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/providers/prov-999/reviews' && request.method == 'POST') {
        return http.Response(
          jsonEncode({'error': 'Customer has already reviewed this provider.'}),
          409,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final reviewRepo = ReviewRepository(apiClient: apiClient);

    expect(
      () => reviewRepo.addReview(
        providerId: 'prov-999',
        rating: 4,
        comment: 'Trying again',
      ),
      throwsA(isA<Exception>()),
    );
  });

  test('ReviewRepository.uploadPhoto uploads multipart file and returns updated ReviewModel', () async {
    final tempDir = Directory.systemTemp.createTempSync();
    final tempFile = File('${tempDir.path}/test_work.jpg')..writeAsStringSync('dummy photo content');

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/reviews/rev-001/photos' && request.method == 'POST') {
        return http.Response(
          jsonEncode({
            'id': 'rev-001',
            'providerProfileId': 'prov-999',
            'customerId': 'cust-001',
            'customerName': 'Amara Silva',
            'rating': 5,
            'comment': 'Fast and friendly technician',
            'photoUrls': ['https://blob.azure.com/photos/rev-001-photo.jpg'],
            'createdAt': '2026-10-02T12:00:00Z',
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final reviewRepo = ReviewRepository(apiClient: apiClient);

    final updated = await reviewRepo.uploadPhoto(
      reviewId: 'rev-001',
      filePath: tempFile.path,
    );

    expect(updated.id, 'rev-001');
    expect(updated.photoUrls, contains('https://blob.azure.com/photos/rev-001-photo.jpg'));

    tempDir.deleteSync(recursive: true);
  });

  test('ApiClient.delete sends DELETE request with authorization header and returns null on 204', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/test-delete' && request.method == 'DELETE') {
        expect(request.headers['Authorization'], 'Bearer test-access-token');
        return http.Response('', 204);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final response = await apiClient.delete('/api/test-delete');
    expect(response, isNull);
  });

  test('ReviewRepository.updateReview puts review payload and returns updated ReviewModel', () async {
    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/reviews/rev-001' && request.method == 'PUT') {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['rating'], 4);
        expect(body['comment'], 'Updated feedback comment');

        return http.Response(
          jsonEncode({
            'id': 'rev-001',
            'providerProfileId': 'prov-999',
            'customerId': 'cust-001',
            'customerName': 'Amara Silva',
            'rating': 4,
            'comment': 'Updated feedback comment',
            'photoUrls': [],
            'createdAt': '2026-10-02T12:00:00Z',
          }),
          200,
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final reviewRepo = ReviewRepository(apiClient: apiClient);

    final updated = await reviewRepo.updateReview(
      reviewId: 'rev-001',
      rating: 4,
      comment: 'Updated feedback comment',
    );

    expect(updated.id, 'rev-001');
    expect(updated.rating, 4);
    expect(updated.comment, 'Updated feedback comment');
  });

  test('ReviewRepository.deleteReview sends DELETE to review endpoint', () async {
    bool deleteCalled = false;
    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/reviews/rev-001' && request.method == 'DELETE') {
        deleteCalled = true;
        return http.Response('', 204);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final reviewRepo = ReviewRepository(apiClient: apiClient);

    await reviewRepo.deleteReview('rev-001');
    expect(deleteCalled, isTrue);
  });
}
