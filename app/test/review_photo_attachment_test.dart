import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:app/data/models/review_model.dart';
import 'package:app/data/repositories/review_repository.dart';
import 'package:app/providers/review_provider.dart';
import 'package:app/widgets/review_card.dart';
import 'package:app/widgets/write_review_bottom_sheet.dart';

class StubReviewRepository extends Fake implements ReviewRepository {
  final List<String> uploadedPaths = [];

  @override
  Future<ReviewModel> addReview({
    required String providerId,
    required int rating,
    String? comment,
  }) async {
    return ReviewModel(
      id: 'rev-photo-test-1',
      providerProfileId: providerId,
      customerId: 'cust-1',
      customerName: 'Test Customer',
      rating: rating,
      comment: comment,
      photoUrls: [],
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<ReviewModel> uploadPhoto({
    required String reviewId,
    required String filePath,
  }) async {
    uploadedPaths.add(filePath);
    return ReviewModel(
      id: reviewId,
      providerProfileId: 'prov-test',
      customerId: 'cust-1',
      customerName: 'Test Customer',
      rating: 5,
      photoUrls: ['https://cdn.handee.lk/uploaded-photo.jpg'],
      createdAt: DateTime.now(),
    );
  }
}

void main() {
  testWidgets('WriteReviewBottomSheet renders attached photos and removes photo on tap', (tester) async {
    final fakeFile1 = XFile('/mock/path/work1.jpg');
    final fakeFile2 = XFile('/mock/path/work2.jpg');

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: WriteReviewBottomSheet(
            providerId: 'prov-test',
            providerName: 'Sunil Perera',
            initialPhotos: [fakeFile1, fakeFile2],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Attach Photos (2/5)'), findsOneWidget);
    expect(find.byKey(const Key('review_remove_photo_0')), findsOneWidget);
    expect(find.byKey(const Key('review_remove_photo_1')), findsOneWidget);

    // Remove first photo
    await tester.tap(find.byKey(const Key('review_remove_photo_0')));
    await tester.pumpAndSettle();

    expect(find.text('Attach Photos (1/5)'), findsOneWidget);
  });

  testWidgets('WriteReviewBottomSheet uploads attached photos sequentially on submit', (tester) async {
    final stubRepo = StubReviewRepository();
    final reviewProvider = ReviewProvider(reviewRepo: stubRepo);
    final fakeFile = XFile('/mock/path/work1.jpg');

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<ReviewProvider>.value(value: reviewProvider),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: WriteReviewBottomSheet(
              providerId: 'prov-test',
              providerName: 'Sunil Perera',
              initialPhotos: [fakeFile],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('submit_review_button')));
    await tester.pumpAndSettle();

    expect(stubRepo.uploadedPaths, contains('/mock/path/work1.jpg'));
  });

  testWidgets('ReviewCard photo thumbnail opens interactive zoom viewer dialog', (tester) async {
    final reviewWithPhoto = ReviewModel(
      id: 'rev-100',
      providerProfileId: 'prov-100',
      customerId: 'cust-1',
      customerName: 'Roshan Silva',
      rating: 5,
      comment: 'Top quality repair work',
      photoUrls: ['https://cdn.handee.lk/photo1.jpg'],
      createdAt: DateTime.now(),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ReviewCard(review: reviewWithPhoto),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final thumbnail = find.byKey(const Key('review_photo_thumbnail_0'));
    expect(thumbnail, findsOneWidget);

    await tester.tap(thumbnail);
    await tester.pumpAndSettle();

    expect(find.byType(InteractiveViewer), findsOneWidget);
    expect(find.byKey(const Key('photo_viewer_close_button')), findsOneWidget);

    await tester.tap(find.byKey(const Key('photo_viewer_close_button')));
    await tester.pumpAndSettle();

    expect(find.byType(InteractiveViewer), findsNothing);
  });
}
