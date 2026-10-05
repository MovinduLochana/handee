import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/review_model.dart';

class ReviewRepository {
  final ApiClient apiClient;

  ReviewRepository({required this.apiClient});

  /// GET /api/providers/{providerId}/reviews?page={page}&pageSize={pageSize}
  Future<PagedReviewResponse> getReviewsForProvider({
    required String providerId,
    int page = 1,
    int pageSize = 10,
  }) async {
    final response = await apiClient.get(
      ApiEndpoints.providerReviews(providerId),
      queryParams: {
        'page': page.toString(),
        'pageSize': pageSize.toString(),
      },
    );

    if (response is Map<String, dynamic>) {
      return PagedReviewResponse.fromJson(response);
    } else if (response is List) {
      return PagedReviewResponse(
        items: response.map((e) => ReviewModel.fromJson(e as Map<String, dynamic>)).toList(),
        totalCount: response.length,
        page: page,
        pageSize: pageSize,
      );
    }

    return PagedReviewResponse(items: [], totalCount: 0, page: page, pageSize: pageSize);
  }

  Map<String, dynamic> _buildReviewPayload(int rating, String? comment) {
    final body = <String, dynamic>{'rating': rating};
    if (comment != null && comment.trim().isNotEmpty) {
      body['comment'] = comment.trim();
    }
    return body;
  }

  /// POST /api/providers/{providerId}/reviews
  Future<ReviewModel> addReview({
    required String providerId,
    required int rating,
    String? comment,
  }) async {
    final body = _buildReviewPayload(rating, comment);

    final response = await apiClient.post(
      ApiEndpoints.providerReviews(providerId),
      body: body,
    );

    if (response is Map<String, dynamic>) {
      return ReviewModel.fromJson(response);
    }
    throw Exception('Unexpected response format when creating review');
  }

  /// POST /api/reviews/{id}/photos
  Future<ReviewModel> uploadPhoto({
    required String reviewId,
    required String filePath,
  }) async {
    final response = await apiClient.postMultipart(
      ApiEndpoints.reviewPhotos(reviewId),
      fileField: 'file',
      filePath: filePath,
    );

    if (response is Map<String, dynamic>) {
      return ReviewModel.fromJson(response);
    }
    throw Exception('Unexpected response format when uploading photo');
  }

  /// PUT /api/reviews/{id}
  Future<ReviewModel> updateReview({
    required String reviewId,
    required int rating,
    String? comment,
  }) async {
    final body = _buildReviewPayload(rating, comment);

    final response = await apiClient.put(
      ApiEndpoints.reviewById(reviewId),
      body: body,
    );

    if (response is Map<String, dynamic>) {
      return ReviewModel.fromJson(response);
    }
    throw Exception('Unexpected response format when updating review');
  }

  /// DELETE /api/reviews/{id}
  Future<void> deleteReview(String reviewId) async {
    await apiClient.delete(ApiEndpoints.reviewById(reviewId));
  }
}
