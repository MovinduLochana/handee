import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'core/constants/api_endpoints.dart';
import 'core/network/api_client.dart';
import 'core/services/storage_service.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/assistant_repository.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/booking_repository.dart';
import 'data/repositories/dispatch_repository.dart';
import 'data/repositories/job_request_repository.dart';
import 'data/repositories/invoice_repository.dart';
import 'data/repositories/payment_repository.dart';
import 'data/repositories/provider_availability_repository.dart';
import 'data/repositories/provider_repository.dart';
import 'data/repositories/review_repository.dart';
import 'data/repositories/service_category_repository.dart';
import 'data/repositories/service_listing_repository.dart';
import 'providers/assistant_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/booking_provider.dart';
import 'providers/dispatch_provider.dart';
import 'providers/job_request_provider.dart';
import 'providers/payment_provider.dart';
import 'providers/review_provider.dart';
import 'providers/service_category_provider.dart';
import 'providers/service_directory_provider.dart';
import 'screens/auth/splash_screen.dart';

Widget buildHandeeApp({
  required StorageService storageService,
  ApiClient? apiClient,
}) {
  final client = apiClient ?? ApiClient(storage: storageService);

  final authRepository = AuthRepository(
    apiClient: client,
    storage: storageService,
  );

  final jobRequestRepository = JobRequestRepository(
    apiClient: client,
    storage: storageService,
  );

  final bookingRepository = BookingRepository(
    apiClient: client,
  );

  final dispatchRepository = DispatchRepository(
    apiClient: client,
    storage: storageService,
  );

  final assistantRepository = AssistantRepository(
    apiClient: client,
  );

  final invoiceRepository = InvoiceRepository(
    apiClient: client,
  );

  final paymentRepository = PaymentRepository(
    apiClient: client,
  );

  final providerRepository = ProviderRepository(
    apiClient: client,
  );

  final serviceListingRepository = ServiceListingRepository(
    apiClient: client,
  );

  final serviceCategoryRepository = ServiceCategoryRepository(
    apiClient: client,
  );

  final providerAvailabilityRepository = ProviderAvailabilityRepository(
    apiClient: client,
  );

  final reviewRepository = ReviewRepository(
    apiClient: client,
  );

  return MultiProvider(
    providers: [
      Provider<ApiClient>.value(value: client),
      Provider<ProviderAvailabilityRepository>.value(value: providerAvailabilityRepository),
      Provider<BookingRepository>.value(value: bookingRepository),
      Provider<ServiceCategoryRepository>.value(value: serviceCategoryRepository),
      ChangeNotifierProvider<AuthProvider>(
        lazy: false,
        create: (_) => AuthProvider(
          authRepo: authRepository,
          storage: storageService,
        ),
      ),
      ChangeNotifierProvider<JobRequestProvider>(
        create: (_) => JobRequestProvider(
          repository: jobRequestRepository,
        ),
      ),
      ChangeNotifierProvider<BookingProvider>(
        create: (_) => BookingProvider(
          repository: bookingRepository,
        ),
      ),
      ChangeNotifierProvider<DispatchProvider>(
        create: (_) => DispatchProvider(
          repository: dispatchRepository,
        ),
      ),
      ChangeNotifierProvider<AssistantProvider>(
        create: (_) => AssistantProvider(
          repository: assistantRepository,
        ),
      ),
      ChangeNotifierProvider<PaymentProvider>(
        create: (_) => PaymentProvider(
          invoiceRepo: invoiceRepository,
          paymentRepo: paymentRepository,
        ),
      ),
      ChangeNotifierProvider<ServiceDirectoryProvider>(
        create: (_) => ServiceDirectoryProvider(
          providerRepo: providerRepository,
          serviceListingRepo: serviceListingRepository,
        ),
      ),
      ChangeNotifierProvider<ServiceCategoryProvider>(
        create: (_) => ServiceCategoryProvider(
          repository: serviceCategoryRepository,
        ),
      ),
      Provider<ReviewRepository>.value(value: reviewRepository),
      ChangeNotifierProvider<ReviewProvider>(
        create: (_) => ReviewProvider(
          reviewRepo: reviewRepository,
        ),
      ),
    ],
    child: const HandeeApp(),
  );
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Enable modern edge-to-edge layout so system bars are transparent and adapt seamlessly
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  // Set default system bar overlay styling with contrast enforcement disabled (prevents black bars in Android 15/16)
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.dark,
      systemNavigationBarDividerColor: Colors.transparent,
      systemStatusBarContrastEnforced: false,
      systemNavigationBarContrastEnforced: false,
    ),
  );

  ApiEndpoints.logStartupConfiguration();
  final storageService = await StorageService.getInstance();
  runApp(buildHandeeApp(storageService: storageService));
}

class HandeeApp extends StatelessWidget {
  const HandeeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Handee',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const SplashScreen(),
    );
  }
}
