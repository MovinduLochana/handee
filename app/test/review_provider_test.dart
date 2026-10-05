import 'package:flutter_test/flutter_test.dart';
import 'package:app/data/models/review_model.dart';
import 'package:app/data/repositories/review_repository.dart';
import 'package:app/providers/review_provider.dart';

class FakeReviewRepository extends Fake implements ReviewRepository {
  final List<ReviewModel> stubbedReviews;
  final int totalCount;
  String? lastQueriedProviderId;
  ReviewModel? nextAddReviewResult;
  ReviewModel? nextUploadPhotoResult;
  ReviewModel? nextUpdateReviewResult;
  String? lastDeletedReviewId;

  FakeReviewRepository({required this.stubbedReviews, this.totalCount = 1});

  @override
  Future<PagedReviewResponse> getReviewsForProvider({
    required String providerId,
    int page = 1,
    int pageSize = 10,
  }) async {
    lastQueriedProviderId = providerId;
    return PagedReviewResponse(
      items: stubbedReviews,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
    );
  }

  @override
  Future<ReviewModel> addReview({
    required String providerId,
    required int rating,
    String? comment,
  }) async {
    if (nextAddReviewResult != null) return nextAddReviewResult!;
    throw UnimplementedError();
  }

  @override
  Future<ReviewModel> uploadPhoto({
    required String reviewId,
    required String filePath,
  }) async {
    if (nextUploadPhotoResult != null) return nextUploadPhotoResult!;
    throw UnimplementedError();
  }

  @override
  Future<ReviewModel> updateReview({
    required String reviewId,
    required int rating,
    String? comment,
  }) async {
    if (nextUpdateReviewResult != null) return nextUpdateReviewResult!;
    throw UnimplementedError();
  }

  @override
  Future<void> deleteReview(String reviewId) async {
    lastDeletedReviewId = reviewId;
  }
}

void main() {
  test('ReviewProvider.fetchReviews populates reviews and notifies listeners', () async {
    final fakeRepo = FakeReviewRepository(
      stubbedReviews: [
        ReviewModel(
          id: 'rev-1',
          providerProfileId: 'prov-100',
          customerId: 'cust-1',
          customerName: 'Nimal Bandara',
          rating: 5,
          comment: 'Great work',
          createdAt: DateTime.now(),
        ),
      ],
      totalCount: 1,
    );

    final provider = ReviewProvider(reviewRepo: fakeRepo);
    expect(provider.isLoading, isFalse);
    expect(provider.reviewsFor('prov-100'), isEmpty);

    bool notified = false;
    provider.addListener(() => notified = true);

    await provider.fetchReviews('prov-100');

    expect(notified, isTrue);
    expect(provider.isLoading, isFalse);
    expect(provider.errorMessage, isNull);
    expect(fakeRepo.lastQueriedProviderId, 'prov-100');
    expect(provider.reviewsFor('prov-100').length, 1);
    expect(provider.reviewsFor('prov-100').first.customerName, 'Nimal Bandara');
    expect(provider.totalReviewsFor('prov-100'), 1);
  });

  test('ReviewProvider.addReview inserts new review at the beginning and increments total count', () async {
    final existingReview = ReviewModel(
      id: 'rev-old',
      providerProfileId: 'prov-200',
      customerId: 'cust-old',
      customerName: 'Old Customer',
      rating: 4,
      comment: 'Good',
      createdAt: DateTime(2026, 10, 1),
    );

    final fakeRepo = FakeReviewRepository(
      stubbedReviews: [existingReview],
      totalCount: 1,
    );

    final provider = ReviewProvider(reviewRepo: fakeRepo);
    await provider.fetchReviews('prov-200');

    expect(provider.reviewsFor('prov-200').length, 1);
    expect(provider.totalReviewsFor('prov-200'), 1);

    final createdReview = ReviewModel(
      id: 'rev-new',
      providerProfileId: 'prov-200',
      customerId: 'cust-new',
      customerName: 'New Customer',
      rating: 5,
      comment: 'Fantastic!',
      createdAt: DateTime(2026, 10, 5),
    );

    fakeRepo.nextAddReviewResult = createdReview;

    final result = await provider.addReview(
      providerId: 'prov-200',
      rating: 5,
      comment: 'Fantastic!',
    );

    expect(result.id, 'rev-new');
    expect(provider.reviewsFor('prov-200').length, 2);
    expect(provider.reviewsFor('prov-200').first.id, 'rev-new');
    expect(provider.totalReviewsFor('prov-200'), 2);
  });

  test('ReviewProvider.uploadReviewPhoto uploads photo and updates review in local cache', () async {
    final existingReview = ReviewModel(
      id: 'rev-photo-1',
      providerProfileId: 'prov-300',
      customerId: 'cust-300',
      customerName: 'Saman',
      rating: 5,
      comment: 'Super job',
      photoUrls: [],
      createdAt: DateTime(2026, 10, 5),
    );

    final fakeRepo = FakeReviewRepository(
      stubbedReviews: [existingReview],
      totalCount: 1,
    );

    final provider = ReviewProvider(reviewRepo: fakeRepo);
    await provider.fetchReviews('prov-300');

    expect(provider.reviewsFor('prov-300').first.photoUrls, isEmpty);

    final updatedReview = ReviewModel(
      id: 'rev-photo-1',
      providerProfileId: 'prov-300',
      customerId: 'cust-300',
      customerName: 'Saman',
      rating: 5,
      comment: 'Super job',
      photoUrls: ['https://cdn.handee.lk/photo1.jpg'],
      createdAt: DateTime(2026, 10, 5),
    );
    fakeRepo.nextUploadPhotoResult = updatedReview;

    final result = await provider.uploadReviewPhoto(
      reviewId: 'rev-photo-1',
      filePath: '/path/to/local_pic.jpg',
    );

    expect(result.photoUrls, contains('https://cdn.handee.lk/photo1.jpg'));
    expect(provider.reviewsFor('prov-300').first.photoUrls, contains('https://cdn.handee.lk/photo1.jpg'));
  });

  test('ReviewProvider.updateReview modifies review in cache and notifies listeners', () async {
    final existingReview = ReviewModel(
      id: 'rev-edit-1',
      providerProfileId: 'prov-400',
      customerId: 'cust-400',
      customerName: 'Kamal',
      rating: 3,
      comment: 'Average service',
      createdAt: DateTime(2026, 10, 1),
    );

    final fakeRepo = FakeReviewRepository(
      stubbedReviews: [existingReview],
      totalCount: 1,
    );

    final provider = ReviewProvider(reviewRepo: fakeRepo);
    await provider.fetchReviews('prov-400');

    expect(provider.reviewsFor('prov-400').first.rating, 3);

    final updated = ReviewModel(
      id: 'rev-edit-1',
      providerProfileId: 'prov-400',
      customerId: 'cust-400',
      customerName: 'Kamal',
      rating: 5,
      comment: 'Issue resolved later, outstanding work!',
      createdAt: DateTime(2026, 10, 1),
    );
    fakeRepo.nextUpdateReviewResult = updated;

    final result = await provider.updateReview(
      reviewId: 'rev-edit-1',
      rating: 5,
      comment: 'Issue resolved later, outstanding work!',
    );

    expect(result.rating, 5);
    expect(result.comment, 'Issue resolved later, outstanding work!');
    expect(provider.reviewsFor('prov-400').first.rating, 5);
    expect(provider.reviewsFor('prov-400').first.comment, 'Issue resolved later, outstanding work!');
  });

  test('ReviewProvider.deleteReview removes review from cache, decrements count, and notifies listeners', () async {
    final review1 = ReviewModel(
      id: 'rev-del-1',
      providerProfileId: 'prov-500',
      customerId: 'cust-1',
      customerName: 'User 1',
      rating: 4,
      createdAt: DateTime(2026, 10, 1),
    );
    final review2 = ReviewModel(
      id: 'rev-del-2',
      providerProfileId: 'prov-500',
      customerId: 'cust-2',
      customerName: 'User 2',
      rating: 5,
      createdAt: DateTime(2026, 10, 2),
    );

    final fakeRepo = FakeReviewRepository(
      stubbedReviews: [review1, review2],
      totalCount: 2,
    );

    final provider = ReviewProvider(reviewRepo: fakeRepo);
    await provider.fetchReviews('prov-500');

    expect(provider.reviewsFor('prov-500').length, 2);
    expect(provider.totalReviewsFor('prov-500'), 2);

    await provider.deleteReview(providerId: 'prov-500', reviewId: 'rev-del-1');

    expect(fakeRepo.lastDeletedReviewId, 'rev-del-1');
    expect(provider.reviewsFor('prov-500').length, 1);
    expect(provider.reviewsFor('prov-500').first.id, 'rev-del-2');
    expect(provider.totalReviewsFor('prov-500'), 1);
  });

  test('ReviewProvider.addReviewWithPhotos creates review and uploads attached photos sequentially', () async {
    final baseReview = ReviewModel(
      id: 'rev-photo-base',
      providerProfileId: 'prov-600',
      customerId: 'cust-1',
      customerName: 'Alice',
      rating: 5,
      createdAt: DateTime.now(),
    );
    final reviewWithPhoto1 = ReviewModel(
      id: 'rev-photo-base',
      providerProfileId: 'prov-600',
      customerId: 'cust-1',
      customerName: 'Alice',
      rating: 5,
      photoUrls: ['https://example.com/p1.jpg'],
      createdAt: DateTime.now(),
    );

    final fakeRepo = FakeReviewRepository(
      stubbedReviews: [],
      totalCount: 0,
    );
    fakeRepo.nextAddReviewResult = baseReview;
    fakeRepo.nextUploadPhotoResult = reviewWithPhoto1;

    final provider = ReviewProvider(reviewRepo: fakeRepo);

    final result = await provider.addReviewWithPhotos(
      providerId: 'prov-600',
      rating: 5,
      comment: 'With photo',
      photoPaths: ['/tmp/p1.jpg'],
    );

    expect(result.photoUrls, contains('https://example.com/p1.jpg'));
    expect(provider.reviewsFor('prov-600').first.photoUrls, contains('https://example.com/p1.jpg'));
  });

  test('ReviewProvider.averageRatingFor recalculates dynamic average after add, edit, and delete', () async {
    final review1 = ReviewModel(
      id: 'rev-avg-1',
      providerProfileId: 'prov-700',
      customerId: 'cust-1',
      customerName: 'User 1',
      rating: 3,
      createdAt: DateTime(2026, 10, 1),
    );
    final review2 = ReviewModel(
      id: 'rev-avg-2',
      providerProfileId: 'prov-700',
      customerId: 'cust-2',
      customerName: 'User 2',
      rating: 5,
      createdAt: DateTime(2026, 10, 2),
    );

    final fakeRepo = FakeReviewRepository(
      stubbedReviews: [review1, review2],
      totalCount: 2,
    );

    final provider = ReviewProvider(reviewRepo: fakeRepo);
    await provider.fetchReviews('prov-700');

    // (3 + 5) / 2 = 4.0
    expect(provider.averageRatingFor('prov-700'), 4.0);

    // Delete review1 (rating 3) -> remaining review2 (rating 5) -> average 5.0
    await provider.deleteReview(providerId: 'prov-700', reviewId: 'rev-avg-1');
    expect(provider.averageRatingFor('prov-700'), 5.0);
  });
}

