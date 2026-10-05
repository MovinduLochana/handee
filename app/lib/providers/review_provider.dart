import 'package:flutter/foundation.dart';
import '../data/models/review_model.dart';
import '../data/repositories/review_repository.dart';

class ReviewProvider extends ChangeNotifier {
  final ReviewRepository reviewRepo;

  ReviewProvider({required this.reviewRepo});

  final Map<String, List<ReviewModel>> _reviewsByProvider = {};
  final Map<String, int> _totalReviewsByProvider = {};

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  List<ReviewModel> reviewsFor(String providerId) =>
      _reviewsByProvider[providerId] ?? const [];

  int totalReviewsFor(String providerId) =>
      _totalReviewsByProvider[providerId] ?? _reviewsByProvider[providerId]?.length ?? 0;


  Future<void> fetchReviews(String providerId, {bool refresh = false, int page = 1, int pageSize = 10}) async {
    if (!refresh && _reviewsByProvider.containsKey(providerId) && page == 1) {
      // Already cached for first page unless refresh requested
      return;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final pagedResult = await reviewRepo.getReviewsForProvider(
        providerId: providerId,
        page: page,
        pageSize: pageSize,
      );

      if (page == 1 || refresh) {
        _reviewsByProvider[providerId] = pagedResult.items;
      } else {
        _reviewsByProvider[providerId] = [
          ...(_reviewsByProvider[providerId] ?? []),
          ...pagedResult.items,
        ];
      }
      _totalReviewsByProvider[providerId] = pagedResult.totalCount;
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<ReviewModel> addReview({
    required String providerId,
    required int rating,
    String? comment,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final newReview = await reviewRepo.addReview(
        providerId: providerId,
        rating: rating,
        comment: comment,
      );

      final current = _reviewsByProvider[providerId] ?? [];
      _reviewsByProvider[providerId] = [newReview, ...current];
      _totalReviewsByProvider[providerId] =
          (_totalReviewsByProvider[providerId] ?? current.length) + 1;
      _errorMessage = null;
      return newReview;
    } catch (e) {
      _errorMessage = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _updateCachedReview(ReviewModel updated) {
    final providerId = updated.providerProfileId;
    final currentList = _reviewsByProvider[providerId];
    if (currentList != null) {
      final index = currentList.indexWhere((r) => r.id == updated.id);
      if (index != -1) {
        currentList[index] = updated;
        _reviewsByProvider[providerId] = List.from(currentList);
      }
    }
  }

  Future<ReviewModel> addReviewWithPhotos({
    required String providerId,
    required int rating,
    String? comment,
    List<String> photoPaths = const [],
  }) async {
    final newReview = await addReview(
      providerId: providerId,
      rating: rating,
      comment: comment,
    );

    ReviewModel currentReview = newReview;
    if (photoPaths.isNotEmpty) {
      for (final path in photoPaths) {
        try {
          currentReview = await uploadReviewPhoto(
            reviewId: currentReview.id,
            filePath: path,
          );
        } catch (err) {
          debugPrint('Error uploading photo in review: $err');
        }
      }
    }

    return currentReview;
  }

  Future<ReviewModel> uploadReviewPhoto({
    required String reviewId,
    required String filePath,
  }) async {
    try {
      final updatedReview = await reviewRepo.uploadPhoto(
        reviewId: reviewId,
        filePath: filePath,
      );

      _updateCachedReview(updatedReview);
      notifyListeners();
      return updatedReview;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<ReviewModel> updateReview({
    required String reviewId,
    required int rating,
    String? comment,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final updated = await reviewRepo.updateReview(
        reviewId: reviewId,
        rating: rating,
        comment: comment,
      );

      _updateCachedReview(updated);
      _errorMessage = null;
      return updated;
    } catch (e) {
      _errorMessage = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteReview({
    required String providerId,
    required String reviewId,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await reviewRepo.deleteReview(reviewId);

      final currentList = _reviewsByProvider[providerId];
      if (currentList != null) {
        _reviewsByProvider[providerId] =
            currentList.where((r) => r.id != reviewId).toList();
      }
      final currentTotal = _totalReviewsByProvider[providerId];
      if (currentTotal != null && currentTotal > 0) {
        _totalReviewsByProvider[providerId] = currentTotal - 1;
      }

      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
