import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/data/models/review_model.dart';
import 'package:app/data/repositories/review_repository.dart';
import 'package:app/providers/review_provider.dart';
import 'package:app/widgets/write_review_bottom_sheet.dart';

class StubReviewRepository extends Fake implements ReviewRepository {
  String? addedProviderId;
  int? addedRating;
  String? addedComment;
  bool shouldThrowConflict = false;

  @override
  Future<ReviewModel> addReview({
    required String providerId,
    required int rating,
    String? comment,
  }) async {
    if (shouldThrowConflict) {
      throw Exception('Customer has already reviewed this provider.');
    }
    addedProviderId = providerId;
    addedRating = rating;
    addedComment = comment;
    return ReviewModel(
      id: 'rev-sub-1',
      providerProfileId: providerId,
      customerId: 'cust-1',
      customerName: 'Test Customer',
      rating: rating,
      comment: comment,
      createdAt: DateTime.now(),
    );
  }
}

void main() {
  testWidgets('WriteReviewBottomSheet renders stars, comment field, and submits review', (tester) async {
    final stubRepo = StubReviewRepository();
    final reviewProvider = ReviewProvider(reviewRepo: stubRepo);

    await tester.pumpWidget(
      ChangeNotifierProvider<ReviewProvider>.value(
        value: reviewProvider,
        child: const MaterialApp(
          home: Scaffold(
            body: WriteReviewBottomSheet(
              providerId: 'prov-abc',
              providerName: 'Sunil Rajapaksha',
            ),
          ),
        ),
      ),
    );

    expect(find.textContaining('Sunil Rajapaksha'), findsOneWidget);
    expect(find.byKey(const Key('submit_review_button')), findsOneWidget);

    // Enter comment
    await tester.enterText(
      find.byKey(const Key('review_comment_field')),
      'Great and clean plumbing repair!',
    );
    await tester.pump();

    // Select 4 stars
    await tester.tap(find.byKey(const Key('star_rating_4')));
    await tester.pump();

    // Tap Submit
    await tester.tap(find.byKey(const Key('submit_review_button')));
    await tester.pumpAndSettle();

    expect(stubRepo.addedProviderId, 'prov-abc');
    expect(stubRepo.addedRating, 4);
    expect(stubRepo.addedComment, 'Great and clean plumbing repair!');
  });

  testWidgets('WriteReviewBottomSheet displays error when 409 Conflict occurs', (tester) async {
    final stubRepo = StubReviewRepository()..shouldThrowConflict = true;
    final reviewProvider = ReviewProvider(reviewRepo: stubRepo);

    await tester.pumpWidget(
      ChangeNotifierProvider<ReviewProvider>.value(
        value: reviewProvider,
        child: const MaterialApp(
          home: Scaffold(
            body: WriteReviewBottomSheet(
              providerId: 'prov-abc',
              providerName: 'Sunil Rajapaksha',
            ),
          ),
        ),
      ),
    );

    // Tap Submit
    await tester.tap(find.byKey(const Key('submit_review_button')));
    await tester.pumpAndSettle();

    expect(find.textContaining('already reviewed'), findsOneWidget);
  });
}
