import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/models/provider_profile_model.dart';
import 'package:app/data/models/review_model.dart';
import 'package:app/data/models/service_listing_model.dart';
import 'package:app/data/models/user_model.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/review_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/review_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/screens/customer/public_provider_profile_screen.dart';
import 'package:app/widgets/review_card.dart';
import 'package:app/widgets/write_review_bottom_sheet.dart';

class StubReviewRepo extends Fake implements ReviewRepository {
  List<ReviewModel> reviews = [];
  ReviewModel? lastUpdated;
  String? lastDeletedId;

  @override
  Future<PagedReviewResponse> getReviewsForProvider({
    required String providerId,
    int page = 1,
    int pageSize = 10,
  }) async {
    return PagedReviewResponse(
      items: reviews,
      totalCount: reviews.length,
      page: page,
      pageSize: pageSize,
    );
  }

  @override
  Future<ReviewModel> updateReview({
    required String reviewId,
    required int rating,
    String? comment,
  }) async {
    lastUpdated = ReviewModel(
      id: reviewId,
      providerProfileId: 'prov-1',
      customerId: 'cust-1',
      customerName: 'Me',
      rating: rating,
      comment: comment,
      createdAt: DateTime.now(),
    );
    return lastUpdated!;
  }

  @override
  Future<void> deleteReview(String reviewId) async {
    lastDeletedId = reviewId;
    reviews.removeWhere((r) => r.id == reviewId);
  }
}

class StubProviderRepo extends Fake implements ProviderRepository {
  @override
  Future<ProviderProfileModel> getProviderProfile(String id) async {
    return ProviderProfileModel(
      id: id,
      userId: 'usr-sunil',
      fullName: 'Sunil Handyman',
      rating: 5.0,
      totalReviews: 1,
      completedJobs: 10,
      serviceArea: 'Colombo',
      skillCategories: ['Plumbing'],
    );
  }
}

class StubServiceListingRepo extends Fake implements ServiceListingRepository {
  @override
  Future<List<ServiceListingModel>> getProviderListings(String providerId) async => [];
}

class FakeAuthRepo extends Fake implements AuthRepository {
  final String userId;
  FakeAuthRepo(this.userId);

  @override
  Future<UserModel?> getCurrentUser() async {
    return UserModel(
      id: userId,
      email: 'me@example.com',
      fullName: 'Self Reviewer',
      role: 'Customer',
    );
  }
}

class FakeStorage extends Fake implements StorageService {
  String? userId;

  @override
  String? getUserId() => userId;

  @override
  bool getUseMock() => false;
}

void main() {
  testWidgets('ReviewCard renders options menu and fires onEdit callback', (tester) async {
    bool editCalled = false;

    final review = ReviewModel(
      id: 'rev-own-1',
      providerProfileId: 'prov-1',
      customerId: 'cust-1',
      customerName: 'Self Reviewer',
      rating: 4,
      comment: 'Nice experience',
      createdAt: DateTime.now(),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ReviewCard(
            review: review,
            isOwnReview: true,
            onEdit: () => editCalled = true,
            onDelete: () {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('review_options_menu_button')), findsOneWidget);

    // Open options menu
    await tester.tap(find.byKey(const Key('review_options_menu_button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('review_edit_action')), findsOneWidget);
    expect(find.byKey(const Key('review_delete_action')), findsOneWidget);

    // Tap edit
    await tester.tap(find.byKey(const Key('review_edit_action')));
    await tester.pumpAndSettle();

    expect(editCalled, isTrue);
  });

  testWidgets('ReviewCard options menu fires onDelete callback', (tester) async {
    bool deleteCalled = false;

    final review = ReviewModel(
      id: 'rev-own-2',
      providerProfileId: 'prov-1',
      customerId: 'cust-1',
      customerName: 'Self Reviewer',
      rating: 5,
      comment: 'Awesome',
      createdAt: DateTime.now(),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ReviewCard(
            review: review,
            isOwnReview: true,
            onEdit: () {},
            onDelete: () => deleteCalled = true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('review_options_menu_button')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('review_delete_action')));
    await tester.pumpAndSettle();

    expect(deleteCalled, isTrue);
  });

  testWidgets('WriteReviewBottomSheet in edit mode populates existing values and updates review', (tester) async {
    final stubRepo = StubReviewRepo();
    final reviewProv = ReviewProvider(reviewRepo: stubRepo);

    final existingReview = ReviewModel(
      id: 'rev-to-edit',
      providerProfileId: 'prov-1',
      customerId: 'cust-1',
      customerName: 'Tester',
      rating: 3,
      comment: 'Original comment',
      createdAt: DateTime.now(),
    );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<ReviewProvider>.value(value: reviewProv),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: WriteReviewBottomSheet(
              providerId: 'prov-1',
              providerName: 'Sunil Master',
              existingReview: existingReview,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Edit Your Review'), findsOneWidget);
    expect(find.text('Original comment'), findsOneWidget);
    expect(find.text('Update Review'), findsOneWidget);

    // Change comment
    await tester.enterText(find.byKey(const Key('review_comment_field')), 'Upgraded comment after repair');
    await tester.pumpAndSettle();

    // Tap Update Review
    await tester.tap(find.byKey(const Key('submit_review_button')));
    await tester.pumpAndSettle();

    expect(stubRepo.lastUpdated, isNotNull);
    expect(stubRepo.lastUpdated!.id, 'rev-to-edit');
    expect(stubRepo.lastUpdated!.comment, 'Upgraded comment after repair');
  });

  testWidgets('PublicProviderProfileScreen allows deleting own review via options menu', (tester) async {
    final stubRepo = StubReviewRepo();
    final ownReview = ReviewModel(
      id: 'rev-own-del',
      providerProfileId: 'prov-sunil',
      customerId: 'cust-me',
      customerName: 'Self Reviewer',
      rating: 5,
      comment: 'Outstanding repair service',
      createdAt: DateTime.now(),
    );

    final reviewProv = ReviewProvider(reviewRepo: stubRepo);
    // Populate provider reviews cache
    stubRepo.reviews = [ownReview];
    await reviewProv.fetchReviews('prov-sunil');

    final directoryProvider = ServiceDirectoryProvider(
      providerRepo: StubProviderRepo(),
      serviceListingRepo: StubServiceListingRepo(),
    );

    final initialProfile = ProviderProfileModel(
      id: 'prov-sunil',
      userId: 'usr-sunil',
      fullName: 'Sunil Handyman',
      rating: 5.0,
      totalReviews: 1,
      completedJobs: 10,
      serviceArea: 'Colombo',
      skillCategories: ['Plumbing'],
    );

    final mockStorage = FakeStorage();
    mockStorage.userId = 'cust-me';
    final authProv = AuthProvider(
      authRepo: FakeAuthRepo('cust-me'),
      storage: mockStorage,
    );
    await authProv.loadUser();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<ReviewProvider>.value(value: reviewProv),
          ChangeNotifierProvider<ServiceDirectoryProvider>.value(value: directoryProvider),
          ChangeNotifierProvider<AuthProvider>.value(value: authProv),
        ],
        child: MaterialApp(
          home: PublicProviderProfileScreen(
            providerId: 'prov-sunil',
            initialProfile: initialProfile,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('review_options_menu_button')),
      300,
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('review_options_menu_button')), findsOneWidget);

    // Tap options menu
    await tester.tap(find.byKey(const Key('review_options_menu_button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('review_delete_action')), findsOneWidget);

    // Tap delete action
    await tester.tap(find.byKey(const Key('review_delete_action')));
    await tester.pumpAndSettle();

    expect(find.text('Delete Review'), findsOneWidget);
    expect(find.byKey(const Key('confirm_delete_review_button')), findsOneWidget);

    // Confirm deletion
    await tester.tap(find.byKey(const Key('confirm_delete_review_button')));
    await tester.pumpAndSettle();

    expect(stubRepo.lastDeletedId, 'rev-own-del');
    expect(find.text('Outstanding repair service'), findsNothing);
  });
}
