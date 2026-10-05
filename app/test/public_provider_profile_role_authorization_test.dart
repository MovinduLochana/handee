import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/data/models/provider_profile_model.dart';
import 'package:app/data/models/user_model.dart';
import 'package:app/data/models/review_model.dart';
import 'package:app/data/models/service_listing_model.dart';
import 'package:app/data/repositories/review_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/review_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/screens/customer/public_provider_profile_screen.dart';

class StubReviewRepo extends Fake implements ReviewRepository {
  @override
  Future<PagedReviewResponse> getReviewsForProvider({
    required String providerId,
    int page = 1,
    int pageSize = 10,
  }) async {
    return PagedReviewResponse(items: [], totalCount: 0, page: 1, pageSize: 10);
  }
}

class StubProviderRepo extends Fake implements ProviderRepository {
  @override
  Future<ProviderProfileModel> getProviderProfile(String id) async {
    return ProviderProfileModel(
      id: id,
      userId: 'usr-sunil',
      fullName: 'Sunil Handyman',
      rating: 4.5,
      totalReviews: 0,
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
  final UserModel? user;
  FakeAuthRepo(this.user);

  @override
  Future<UserModel?> getCurrentUser() async => user;
}

class FakeStorageService extends Fake implements StorageService {
  @override
  bool getUseMock() => false;
  @override
  String? getUserId() => null;
}

void main() {
  final testProfile = ProviderProfileModel(
    id: 'prov-sunil',
    userId: 'usr-sunil',
    fullName: 'Sunil Handyman',
    rating: 4.5,
    totalReviews: 0,
    completedJobs: 10,
    serviceArea: 'Colombo',
    skillCategories: ['Plumbing'],
  );

  Widget buildScreen({UserModel? loggedInUser}) {
    final authProvider = AuthProvider(
      authRepo: FakeAuthRepo(loggedInUser),
      storage: FakeStorageService(),
    );
    final reviewProvider = ReviewProvider(reviewRepo: StubReviewRepo());
    final directoryProvider = ServiceDirectoryProvider(
      providerRepo: StubProviderRepo(),
      serviceListingRepo: StubServiceListingRepo(),
    );

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<ReviewProvider>.value(value: reviewProvider),
        ChangeNotifierProvider<ServiceDirectoryProvider>.value(value: directoryProvider),
      ],
      child: MaterialApp(
        home: PublicProviderProfileScreen(
          providerId: 'prov-sunil',
          initialProfile: testProfile,
        ),
      ),
    );
  }

  testWidgets('Authenticated customer sees Write a Review and Leave the First Review buttons', (tester) async {
    final customer = UserModel(
      id: 'cust-1',
      fullName: 'Kamal Silva',
      email: 'kamal@example.com',
      role: 'Customer',
    );

    await tester.pumpWidget(buildScreen(loggedInUser: customer));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(find.text('Customer Reviews'), 300);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('write_review_button')), findsOneWidget);
    expect(find.text('Leave the First Review'), findsOneWidget);
  });

  testWidgets('Authenticated provider does NOT see Write a Review button', (tester) async {
    final provider = UserModel(
      id: 'other-prov-user',
      fullName: 'Other Provider',
      email: 'other@example.com',
      role: 'Provider',
    );

    await tester.pumpWidget(buildScreen(loggedInUser: provider));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(find.text('Customer Reviews'), 300);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('write_review_button')), findsNothing);
    expect(find.text('Leave the First Review'), findsNothing);
  });

  testWidgets('Unauthenticated visitor does NOT see Write a Review button', (tester) async {
    await tester.pumpWidget(buildScreen(loggedInUser: null));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(find.text('Customer Reviews'), 300);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('write_review_button')), findsNothing);
    expect(find.text('Leave the First Review'), findsNothing);
  });
}
