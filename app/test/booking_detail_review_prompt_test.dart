import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/models/provider_profile_model.dart';
import 'package:app/data/models/review_model.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/invoice_repository.dart';
import 'package:app/data/repositories/payment_repository.dart';
import 'package:app/data/repositories/provider_availability_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/review_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/payment_provider.dart';
import 'package:app/providers/review_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/screens/shared/booking_detail_screen.dart';
import 'package:app/widgets/write_review_bottom_sheet.dart';

class StubBookingRepo extends Fake implements BookingRepository {
  final BookingModel booking;
  StubBookingRepo(this.booking);

  @override
  Future<BookingModel?> getBookingById(String id) async => booking;
}

class StubReviewRepo extends Fake implements ReviewRepository {
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
      id: 'rev-test-1',
      providerProfileId: providerId,
      customerId: 'cust-user-123',
      customerName: 'Customer Test',
      rating: rating,
      comment: comment,
      createdAt: DateTime.now(),
    );
    reviews.insert(0, rev);
    return rev;
  }
}


void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'cust-user-123',
      'user_role': 'Customer',
    });
    storage = await StorageService.getInstance();
  });

  Widget createTestWidget(BookingModel booking) {
    final client = ApiClient(storage: storage);
    final bookingRepo = StubBookingRepo(booking);
    final bookingProvider = BookingProvider(repository: bookingRepo);
    final authProvider = AuthProvider(
      authRepo: AuthRepository(apiClient: client, storage: storage),
      storage: storage,
    );
    final paymentProvider = PaymentProvider(
      invoiceRepo: InvoiceRepository(apiClient: client),
      paymentRepo: PaymentRepository(apiClient: client),
    );
    final serviceDirectoryProvider = ServiceDirectoryProvider(
      providerRepo: ProviderRepository(apiClient: client),
      serviceListingRepo: ServiceListingRepository(apiClient: client),
    );
    final availabilityRepo = ProviderAvailabilityRepository(apiClient: client);
    final reviewRepo = StubReviewRepo();
    final reviewProvider = ReviewProvider(reviewRepo: reviewRepo);

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<PaymentProvider>.value(value: paymentProvider),
        ChangeNotifierProvider<ServiceDirectoryProvider>.value(value: serviceDirectoryProvider),
        Provider<ProviderAvailabilityRepository>.value(value: availabilityRepo),
        ChangeNotifierProvider<ReviewProvider>.value(value: reviewProvider),
      ],
      child: MaterialApp(
        home: BookingDetailScreen(
          bookingId: booking.id,
          initialBooking: booking,
        ),
      ),
    );
  }

  testWidgets('BookingDetailScreen displays Rate & Review Specialist CTA on completed booking and opens WriteReviewBottomSheet', (tester) async {
    final completedBooking = BookingModel(
      id: 'b-comp-1',
      providerId: 'prov-456',
      customerId: 'cust-user-123',
      status: 'Completed',
      scheduledAt: DateTime.now().subtract(const Duration(hours: 2)),
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      providerName: 'Saman Silva',
      customerName: 'Customer Test',
      category: 'Plumbing',
      description: 'Repair pipe leak',
      price: 4500,
      provider: ProviderProfileModel(
        id: 'prov-456',
        userId: 'usr-456',
        fullName: 'Saman Silva',
        serviceArea: 'Colombo',
        skillCategories: ['Plumbing'],
      ),
    );

    await tester.pumpWidget(createTestWidget(completedBooking));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('rate_specialist_button')),
      300,
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('rate_specialist_button')), findsOneWidget);
    expect(find.text('Rate & Review Specialist'), findsOneWidget);

    // Tap the review button
    await tester.tap(find.byKey(const Key('rate_specialist_button')));
    await tester.pumpAndSettle();

    expect(find.byType(WriteReviewBottomSheet), findsOneWidget);
    expect(find.text('Review Saman Silva'), findsOneWidget);
  });

  testWidgets('BookingDetailScreen does NOT display review CTA on incomplete booking', (tester) async {
    final inProgressBooking = BookingModel(
      id: 'b-prog-1',
      providerId: 'prov-456',
      customerId: 'cust-user-123',
      status: 'InProgress',
      scheduledAt: DateTime.now().add(const Duration(hours: 2)),
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      providerName: 'Saman Silva',
      customerName: 'Customer Test',
      category: 'Plumbing',
      description: 'Repair pipe leak',
      price: 4500,
    );

    await tester.pumpWidget(createTestWidget(inProgressBooking));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('rate_specialist_button')), findsNothing);
  });

  testWidgets('BookingDetailScreen switches prompt card to Review Submitted state after review submission', (tester) async {
    final completedBooking = BookingModel(
      id: 'b-comp-2',
      providerId: 'prov-456',
      customerId: 'cust-user-123',
      status: 'Completed',
      scheduledAt: DateTime.now().subtract(const Duration(hours: 2)),
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      providerName: 'Saman Silva',
      customerName: 'Customer Test',
      category: 'Plumbing',
      description: 'Repair pipe leak',
      price: 4500,
      provider: ProviderProfileModel(
        id: 'prov-456',
        userId: 'usr-456',
        fullName: 'Saman Silva',
        serviceArea: 'Colombo',
        skillCategories: ['Plumbing'],
      ),
    );

    await tester.pumpWidget(createTestWidget(completedBooking));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('rate_specialist_button')),
      300,
    );
    await tester.pumpAndSettle();

    // Tap review button
    await tester.tap(find.byKey(const Key('rate_specialist_button')));
    await tester.pumpAndSettle();

    expect(find.byType(WriteReviewBottomSheet), findsOneWidget);

    // Tap 4th star
    await tester.tap(find.byKey(const Key('star_rating_4')));
    await tester.pumpAndSettle();

    // Tap submit button in bottom sheet
    await tester.tap(find.byKey(const Key('submit_review_button')));
    await tester.pumpAndSettle();

    // Verify confirmation card appears
    expect(find.text('Review Submitted'), findsOneWidget);
    expect(find.text('Thank you for rating your specialist!'), findsOneWidget);
    expect(find.byKey(const Key('rate_specialist_button')), findsNothing);
  });
}

