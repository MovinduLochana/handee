import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/dispatch_repository.dart';
import 'package:app/data/repositories/invoice_repository.dart';
import 'package:app/data/repositories/payment_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/service_category_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/dispatch_provider.dart';
import 'package:app/providers/payment_provider.dart';
import 'package:app/providers/service_category_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/screens/customer/public_provider_profile_screen.dart';
import 'package:app/screens/provider/edit_provider_profile_screen.dart';
import 'package:app/screens/provider/provider_home_screen.dart';
import 'package:app/widgets/provider_listing_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'prov-001',
      'user_name': 'Samantha Silva',
      'user_role': 'Provider',
    });
    storage = await StorageService.getInstance();
  });

  testWidgets('Provider Home Screen renders Customer-style ProviderListingCard, views profile, and edits profile', (tester) async {
    final mockPayoutSummary = {
      'providerId': 'prov-001',
      'totalEarnings': 28500.0,
      'availableBalance': 4500.0,
      'pendingPayouts': 0.0,
      'completedJobsCount': 9,
      'recentPayouts': [],
    };

    final mockProfile = {
      'id': 'prov-001',
      'userId': 'prov-001',
      'fullName': 'Samantha Silva',
      'headline': 'Senior HVAC & Plumbing Engineer',
      'verificationStatus': 'Verified',
      'skillCategories': ['Plumbing', 'HVAC'],
      'yearsOfExperience': 12,
      'hourlyRate': 3000.0,
      'ratingAggregate': 4.9,
      'totalReviewCount': 24,
      'completedJobs': 9,
      'isAvailable': true,
      'serviceArea': 'Colombo 03',
    };

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') return http.Response('[]', 200);
      if (request.url.path == '/bookings/provider-mine') return http.Response('[]', 200);
      if (request.url.path == '/api/provider/instant-offers') return http.Response('[]', 200);
      if (request.url.path == '/api/payouts/summary') return http.Response(jsonEncode(mockPayoutSummary), 200);
      if (request.url.path == '/api/providers/me') return http.Response(jsonEncode(mockProfile), 200);
      if (request.url.path.startsWith('/api/providers/prov-001')) return http.Response(jsonEncode(mockProfile), 200);
      if (request.url.path.startsWith('/api/service-listings')) return http.Response('[]', 200);
      if (request.url.path == '/api/services/categories' || request.url.path == '/api/service-categories') return http.Response('[]', 200);
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final bookingRepo = BookingRepository(apiClient: apiClient);
    final dispatchRepo = DispatchRepository(apiClient: apiClient, storage: storage);
    final authRepo = AuthRepository(apiClient: apiClient, storage: storage);
    final providerRepo = ProviderRepository(apiClient: apiClient);
    final listingRepo = ServiceListingRepository(apiClient: apiClient);
    final invoiceRepo = InvoiceRepository(apiClient: apiClient);
    final paymentRepo = PaymentRepository(apiClient: apiClient);
    final categoryRepo = ServiceCategoryRepository(apiClient: apiClient);

    final bookingProvider = BookingProvider(repository: bookingRepo);
    final dispatchProvider = DispatchProvider(repository: dispatchRepo);
    final authProvider = AuthProvider(authRepo: authRepo, storage: storage);
    final dirProvider = ServiceDirectoryProvider(
      providerRepo: providerRepo,
      serviceListingRepo: listingRepo,
    );
    final paymentProvider = PaymentProvider(
      invoiceRepo: invoiceRepo,
      paymentRepo: paymentRepo,
    );
    final categoryProvider = ServiceCategoryProvider(repository: categoryRepo);

    await bookingProvider.fetchProviderBookings();
    await dispatchProvider.fetchOffers();
    await dirProvider.loadMyProviderProfile();
    await paymentProvider.fetchProviderEarningsSummary();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: bookingProvider),
          ChangeNotifierProvider.value(value: dispatchProvider),
          ChangeNotifierProvider.value(value: authProvider),
          ChangeNotifierProvider.value(value: dirProvider),
          ChangeNotifierProvider.value(value: paymentProvider),
          ChangeNotifierProvider.value(value: categoryProvider),
        ],
        child: const MaterialApp(
          home: ProviderHomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify Customer-style ProviderListingCard is rendered on ProviderHomeScreen
    expect(find.byType(ProviderListingCard), findsOneWidget);
    expect(find.descendant(of: find.byType(ProviderListingCard), matching: find.text('Samantha Silva')), findsOneWidget);
    expect(find.text('Senior HVAC & Plumbing Engineer'), findsNWidgets(2)); // AppBar subtitle + Card
    expect(find.text('4.9'), findsOneWidget);
    expect(find.text(' (24 reviews)'), findsOneWidget);
    expect(find.text('Colombo 03'), findsOneWidget);
    expect(find.text('9 Jobs done'), findsOneWidget);

    // Verify edit profile button is removed from the card, and only View Profile exists
    expect(find.byKey(const Key('card_edit_profile_button')), findsNothing);
    expect(find.text('View Profile'), findsWidgets);

    // 2. Tap View Profile button on the card to view public profile
    await tester.tap(find.text('View Profile').first);
    await tester.pumpAndSettle();

    // Verify PublicProviderProfileScreen is pushed
    expect(find.byType(PublicProviderProfileScreen), findsOneWidget);

    // 3. Verify instead of "Browse & Book Services", an "Edit Profile" button is rendered for the owner
    expect(find.text('Browse & Book Services'), findsNothing);
    final editProfileBtn = find.byKey(const Key('provider_public_profile_edit_button'));
    expect(editProfileBtn, findsOneWidget);
    expect(find.descendant(of: editProfileBtn, matching: find.text('Edit Profile')), findsOneWidget);

    // 4. Tap Edit Profile button on PublicProviderProfileScreen
    await tester.tap(editProfileBtn);
    await tester.pumpAndSettle();

    // Verify EditProviderProfileScreen is pushed
    expect(find.byType(EditProviderProfileScreen), findsOneWidget);
    expect(find.text('Manage Trade Profile'), findsOneWidget);
  });
}
