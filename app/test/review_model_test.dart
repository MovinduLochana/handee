import 'package:flutter_test/flutter_test.dart';
import 'package:app/core/constants/api_endpoints.dart';
import 'package:app/data/models/review_model.dart';

Map<String, dynamic> realReviewJson() => {
      'id': '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      'providerProfileId': '7b13e9a0-629a-4c22-9b2f-98f5a6f23b10',
      'customerId': '8c33e9a0-629a-4c22-9b2f-98f5a6f23c21',
      'customerName': 'Kamal Perera',
      'customerProfilePictureUrl': '/uploads/profiles/kamal.jpg',
      'rating': 5,
      'comment': 'Excellent plumbing work, fixed the leak in 30 minutes!',
      'photoUrls': ['https://storage.handee.lk/reviews/leak-fixed.jpg'],
      'createdAt': '2026-10-01T08:30:00.000Z',
      'updatedAt': null,
    };

void main() {
  group('ReviewModel.fromJson against backend ReviewDto contract', () {
    test('maps all scalar fields accurately from camelCase JSON', () {
      final model = ReviewModel.fromJson(realReviewJson());

      expect(model.id, '3fa85f64-5717-4562-b3fc-2c963f66afa6');
      expect(model.providerProfileId, '7b13e9a0-629a-4c22-9b2f-98f5a6f23b10');
      expect(model.customerId, '8c33e9a0-629a-4c22-9b2f-98f5a6f23c21');
      expect(model.customerName, 'Kamal Perera');
      expect(model.customerProfilePictureUrl, '/uploads/profiles/kamal.jpg');
      expect(model.rating, 5);
      expect(model.comment, 'Excellent plumbing work, fixed the leak in 30 minutes!');
      expect(model.photoUrls, ['https://storage.handee.lk/reviews/leak-fixed.jpg']);
      expect(model.createdAt.year, 2026);
      expect(model.updatedAt, isNull);
    });

    test('handles fallback defaults when optional fields are null or missing', () {
      final minimalJson = {
        'id': '11111111-2222-3333-4444-555555555555',
        'providerProfileId': '22222222-3333-4444-5555-666666666666',
        'customerId': '33333333-4444-5555-6666-777777777777',
        'rating': 4,
      };

      final model = ReviewModel.fromJson(minimalJson);

      expect(model.id, '11111111-2222-3333-4444-555555555555');
      expect(model.customerName, 'Anonymous Customer');
      expect(model.customerProfilePictureUrl, isNull);
      expect(model.comment, isNull);
      expect(model.photoUrls, isEmpty);
      expect(model.rating, 4);
    });

    test('normalizes relative customer profile picture URL with baseUrl', () {
      final model = ReviewModel.fromJson(realReviewJson());
      expect(model.fullCustomerPhotoUrl, isNotNull);
      expect(model.fullCustomerPhotoUrl, contains('/uploads/profiles/kamal.jpg'));
    });

    test('guarantees single leading slash for relative customer profile picture URL without leading slash', () {
      final json = realReviewJson();
      json['customerProfilePictureUrl'] = 'uploads/profiles/kamal.jpg';
      final model = ReviewModel.fromJson(json);
      expect(model.fullCustomerPhotoUrl, contains('/uploads/profiles/kamal.jpg'));
      expect(model.fullCustomerPhotoUrl, isNot(contains('netuploads/profiles/kamal.jpg')));
    });

    test('preserves absolute URL for customer profile picture', () {
      final json = realReviewJson();
      json['customerProfilePictureUrl'] = 'https://cdn.example.com/avatar.jpg';
      final model = ReviewModel.fromJson(json);
      expect(model.fullCustomerPhotoUrl, 'https://cdn.example.com/avatar.jpg');
    });

    test('fullPhotoUrls normalizes relative photo URLs with baseUrl and guarantees leading slash', () {
      final json = realReviewJson();
      json['photoUrls'] = [
        'uploads/reviews/work1.jpg',
        '/uploads/reviews/work2.jpg',
        'https://cdn.example.com/work3.jpg'
      ];
      final model = ReviewModel.fromJson(json);

      expect(model.fullPhotoUrls.length, 3);
      expect(model.fullPhotoUrls[0], '${ApiEndpoints.baseUrl}/uploads/reviews/work1.jpg');
      expect(model.fullPhotoUrls[1], '${ApiEndpoints.baseUrl}/uploads/reviews/work2.jpg');
      expect(model.fullPhotoUrls[2], 'https://cdn.example.com/work3.jpg');
    });

    test('parses PagedReviewResponse correctly', () {
      final pagedJson = {
        'items': [realReviewJson()],
        'totalCount': 1,
        'page': 1,
        'pageSize': 10,
      };

      final paged = PagedReviewResponse.fromJson(pagedJson);
      expect(paged.items.length, 1);
      expect(paged.totalCount, 1);
      expect(paged.page, 1);
      expect(paged.pageSize, 10);
      expect(paged.items.first.customerName, 'Kamal Perera');
    });
  });
}
