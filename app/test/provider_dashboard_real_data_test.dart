import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/core/utils/external_launcher_helper.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/dispatch_repository.dart';
import 'package:app/data/repositories/invoice_repository.dart';
import 'package:app/data/repositories/payment_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/dispatch_provider.dart';
import 'package:app/providers/payment_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/screens/provider/provider_home_screen.dart';

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

  tearDown(() {
    ExternalLauncherHelper.urlLauncherOverride = null;
  });

  testWidgets('Provider Dashboard displays real KPI metrics from payout ledger and provider profile', (tester) async {
    final activeInstantBooking = {
      'id': 'book-inst-456',
      'customerId': 'cust-1',
      'customerName': 'Kasun Perera',
      'customerPhone': '+94 77 999 8888',
      'providerId': 'prov-001',
      'serviceLocation': 'Bambalapitiya, Colombo 04',
      'category': 'Emergency Pipe Repair',
      'description': 'Burst pipe in kitchen',
      'price': 4500.0,
      'status': 'InProgress',
      'bookingType': 'InstantMatch',
      'createdAt': DateTime.now().toIso8601String(),
    };

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
      'isAvailable': true,
    };

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') {
        return http.Response('[]', 200);
      }
      if (request.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode([activeInstantBooking]), 200);
      }
      if (request.url.path == '/api/provider/instant-offers') {
        return http.Response('[]', 200);
      }
      if (request.url.path == '/api/payouts/summary') {
        return http.Response(jsonEncode(mockPayoutSummary), 200);
      }
      if (request.url.path == '/api/providers/me') {
        return http.Response(jsonEncode(mockProfile), 200);
      }
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
        ],
        child: const MaterialApp(
          home: ProviderHomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify Real KPI Cards
    // Net Earnings from ledger
    expect(find.text('Net Earnings'), findsOneWidget);
    expect(find.text('Rs. 28,500'), findsOneWidget);

    // Completed jobs from ledger
    expect(find.text('Completed'), findsOneWidget);
    expect(find.text('9 Jobs'), findsOneWidget);

    // Rating with review count
    expect(find.text('Rating (24)'), findsOneWidget);
    expect(find.text('4.9 ★'), findsOneWidget);

    // 2. Verify Active Field Assignment has real data
    expect(find.text('Active Field Assignment'), findsOneWidget);
    expect(find.text('⚡ INSTANT'), findsOneWidget);
    expect(find.text('Emergency Pipe Repair'), findsOneWidget);
    expect(find.text('Kasun Perera'), findsOneWidget);
    expect(find.text('Rs. 4,500'), findsOneWidget);
    expect(find.text('Bambalapitiya, Colombo 04'), findsOneWidget);

    // 3. Verify quick call and directions buttons
    Uri? launchedUri;
    ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
      launchedUri = uri;
      return true;
    };

    final callBtn = find.byKey(const Key('dashboard_quick_call_button'));
    expect(callBtn, findsOneWidget);
    await tester.tap(callBtn);
    await tester.pumpAndSettle();
    expect(launchedUri.toString(), equals('tel:+94779998888'));

    final mapBtn = find.byKey(const Key('dashboard_navigate_button'));
    expect(mapBtn, findsOneWidget);
    await tester.tap(mapBtn);
    await tester.pumpAndSettle();
    expect(launchedUri.toString(), contains('Bambalapitiya'));

    // 4. Verify Trade Profile Card displays real profile data without mock fallbacks
    // Headline appears in both AppBar subtitle and Trade Profile card
    expect(find.text('Senior HVAC & Plumbing Engineer'), findsNWidgets(2));
    expect(find.textContaining('Plumbing · HVAC'), findsOneWidget);
    expect(find.textContaining('12 yrs exp'), findsOneWidget);
    expect(find.textContaining('Rs. 3000 / hr'), findsOneWidget);
  });

  testWidgets('Provider Dashboard displays zero states and New rating for brand-new provider', (tester) async {
    final mockPayoutSummary = {
      'providerId': 'prov-001',
      'totalEarnings': 0.0,
      'availableBalance': 0.0,
      'pendingPayouts': 0.0,
      'completedJobsCount': 0,
      'recentPayouts': [],
    };

    final mockProfile = {
      'id': 'prov-001',
      'userId': 'prov-001',
      'fullName': 'Samantha Silva',
      'headline': null,
      'verificationStatus': 'Verified',
      'skillCategories': [],
      'yearsOfExperience': 0,
      'hourlyRate': null,
      'ratingAggregate': 0.0,
      'totalReviewCount': 0,
      'isAvailable': true,
    };

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') return http.Response('[]', 200);
      if (request.url.path == '/bookings/provider-mine') return http.Response('[]', 200);
      if (request.url.path == '/api/provider/instant-offers') return http.Response('[]', 200);
      if (request.url.path == '/api/payouts/summary') return http.Response(jsonEncode(mockPayoutSummary), 200);
      if (request.url.path == '/api/providers/me') return http.Response(jsonEncode(mockProfile), 200);
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
        ],
        child: const MaterialApp(
          home: ProviderHomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Zero state financials
    expect(find.text('Net Earnings'), findsOneWidget);
    expect(find.text('Rs. 0'), findsOneWidget);

    expect(find.text('Completed'), findsOneWidget);
    expect(find.text('0 Jobs'), findsOneWidget);

    // 2. Rating for new provider without reviews
    expect(find.text('Rating'), findsOneWidget);
    expect(find.text('New ★'), findsOneWidget);

    // 3. Empty active assignment message
    expect(find.textContaining('No job in progress right now'), findsOneWidget);

    // 4. Trade profile fallback states
    expect(find.textContaining('Samantha Silva • Verified Trade Specialist'), findsOneWidget);
    expect(find.textContaining('Categories not set'), findsOneWidget);
    expect(find.textContaining('Experience not set'), findsOneWidget);
    expect(find.textContaining('Custom Job Quotes'), findsOneWidget);
  });

  testWidgets('Pull-to-refresh preserves real provider state even when booking requests or payout summary return 404', (tester) async {
    final activeInstantBooking = {
      'id': 'book-inst-456',
      'customerId': 'cust-1',
      'customerName': 'Kasun Perera',
      'customerPhone': '+94 77 999 8888',
      'providerId': 'prov-001',
      'serviceLocation': 'Bambalapitiya, Colombo 04',
      'category': 'Emergency Pipe Repair',
      'description': 'Burst pipe in kitchen',
      'price': 4500.0,
      'status': 'InProgress',
      'bookingType': 'InstantMatch',
      'createdAt': DateTime.now().toIso8601String(),
    };

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
      'isAvailable': true,
    };

    bool isRefreshing = false;

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') {
        // Return 404 to simulate undeployed endpoint on live Azure backend
        return http.Response('Not Found', 404);
      }
      if (request.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode([activeInstantBooking]), 200);
      }
      if (request.url.path == '/api/provider/instant-offers') {
        return http.Response('[]', 200);
      }
      if (request.url.path == '/api/payouts/summary') {
        if (isRefreshing) {
          // Simulate transient 404 or network glitch on payout summary during refresh
          return http.Response('Not Found', 404);
        }
        return http.Response(jsonEncode(mockPayoutSummary), 200);
      }
      if (request.url.path == '/api/providers/me') {
        return http.Response(jsonEncode(mockProfile), 200);
      }
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
        ],
        child: const MaterialApp(
          home: ProviderHomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify initial real state is loaded
    expect(find.text('Senior HVAC & Plumbing Engineer'), findsNWidgets(2));
    expect(find.text('Emergency Pipe Repair'), findsOneWidget);
    expect(find.text('Rs. 28,500'), findsOneWidget);

    // Trigger Pull-to-Refresh
    isRefreshing = true;
    final refreshIndicator = find.byType(RefreshIndicator);
    expect(refreshIndicator, findsOneWidget);
    await tester.fling(refreshIndicator, const Offset(0, 300), 1000);
    await tester.pumpAndSettle();

    // Verify all real provider data is intact and preserved, zero mock defaults injected
    expect(find.text('Senior HVAC & Plumbing Engineer'), findsNWidgets(2));
    expect(find.text('Emergency Pipe Repair'), findsOneWidget);
    expect(find.text('Rs. 28,500'), findsOneWidget);
    expect(find.text('Master Plumber & AC Repair Specialist'), findsNothing);
  });
}
