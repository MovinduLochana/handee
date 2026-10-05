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

class StubReviewRepository extends Fake implements ReviewRepository {
  final List<ReviewModel> reviews;
  StubReviewRepository(this.reviews);

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
  testWidgets('PublicProviderProfileScreen fetches and renders Customer Reviews section', (tester) async {
    final stubReviews = [
      ReviewModel(
        id: 'rev-1',
        providerProfileId: 'prov-sunil',
        customerId: 'cust-1',
        customerName: 'Anura Kumara',
        rating: 5,
        comment: 'Super fast leak fix!',
        createdAt: DateTime(2026, 10, 1),
      ),
    ];

    final reviewRepo = StubReviewRepository(stubReviews);
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
      totalReviews: 1,
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
      find.text('Customer Reviews'),
      300,
    );
    await tester.pumpAndSettle();

    expect(find.text('Customer Reviews'), findsOneWidget);
    expect(find.text('Anura Kumara'), findsOneWidget);
    expect(find.text('Super fast leak fix!'), findsOneWidget);
  });
}
