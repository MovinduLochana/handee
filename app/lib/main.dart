import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

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
import 'providers/assistant_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/booking_provider.dart';
import 'providers/dispatch_provider.dart';
import 'providers/job_request_provider.dart';
import 'providers/payment_provider.dart';
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

  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>(
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
    ],
    child: const HandeeApp(),
  );
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
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
