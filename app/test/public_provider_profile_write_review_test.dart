import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/data/models/provider_profile_model.dart';
import 'package:app/data/models/review_model.dart';
import 'package:app/data/models/service_listing_model.dart';
import 'package:app/data/repositories/review_repository.dart';
import 'package:app/providers/review_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/screens/customer/public_provider_profile_screen.dart';
import 'package:app/widgets/write_review_bottom_sheet.dart';

class StubReviewRepository extends Fake implements ReviewRepository {
  final List<ReviewModel> reviews = [];

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
  Future<ReviewModel> addReview({
    required String providerId,
    required int rating,
    String? comment,
  }) async {
    final rev = ReviewModel(
      id: 'rev-new-test',
      providerProfileId: providerId,
      customerId: 'cust-1',
      customerName: 'Verified Reviewer',
      rating: rating,
      comment: comment,
      createdAt: DateTime.now(),
    );
    reviews.insert(0, rev);
    return rev;
  }
}

class StubProviderRepository extends Fake implements ProviderRepository {
  @override
  Future<ProviderProfileModel> getProviderProfile(String id) async {
    return ProviderProfileModel(
      id: id,
      userId: 'usr-1',
      fullName: 'Sunil Handyman',
      rating: 4.8,
      totalReviews: 2,
      completedJobs: 15,
      serviceArea: 'Colombo',
      skillCategories: ['Plumbing'],
    );
  }
}

class StubServiceListingRepository extends Fake implements ServiceListingRepository {
  @override
  Future<List<ServiceListingModel>> getProviderListings(String providerId) async => [];
}

void main() {
  testWidgets('PublicProviderProfileScreen renders Write a Review button and opens WriteReviewBottomSheet', (tester) async {
    final reviewRepo = StubReviewRepository();
    final reviewProvider = ReviewProvider(reviewRepo: reviewRepo);
    final directoryProvider = ServiceDirectoryProvider(
      providerRepo: StubProviderRepository(),
      serviceListingRepo: StubServiceListingRepository(),
    );

    final initialProfile = ProviderProfileModel(
      id: 'prov-sunil',
      userId: 'usr-1',
      fullName: 'Sunil Handyman',
      rating: 4.8,
      totalReviews: 0,
      completedJobs: 15,
      serviceArea: 'Colombo',
      skillCategories: ['Plumbing'],
    );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<ReviewProvider>.value(value: reviewProvider),
          ChangeNotifierProvider<ServiceDirectoryProvider>.value(value: directoryProvider),
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
      find.byKey(const Key('write_review_button')),
      300,
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('write_review_button')), findsOneWidget);

    // Tap "Write a Review"
    await tester.tap(find.byKey(const Key('write_review_button')));
    await tester.pumpAndSettle();

    // Verify WriteReviewBottomSheet opened
    expect(find.byType(WriteReviewBottomSheet), findsOneWidget);
  });
}
