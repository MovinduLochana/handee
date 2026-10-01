import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

/// Centralized API Endpoints for Handee ASP.NET Core Backend.
/// Matches the exact routes implemented in Handee.Api controllers.
class ApiEndpoints {
  ApiEndpoints._();

  /// Live deployed Azure backend URL
  static const String liveBackendUrl =
      'https://sefproject-g3cmczhth2cygqgh.southeastasia-01.azurewebsites.net';

  // Base URL configuration:
  // - Default: Deployed Azure App Service
  // - Use --dart-define=API_URL=https://... to override with a custom URL
  // - Use --dart-define=USE_LOCAL=true to point to local backend (emulator/localhost)
  // - Use --dart-define=DEVICE=true to target a Physical Device over Wi-Fi
  static const String customApiUrl = String.fromEnvironment('API_URL', defaultValue: '');
  static const bool useLocal = bool.fromEnvironment('USE_LOCAL', defaultValue: false);
  static const bool usePhysicalDevice = bool.fromEnvironment('DEVICE', defaultValue: false);
  static const String physicalDeviceIp = '192.168.1.3';

  static String get defaultHost {
    if (kIsWeb) return 'localhost';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return usePhysicalDevice ? physicalDeviceIp : '10.0.2.2';
    }
    return usePhysicalDevice ? physicalDeviceIp : 'localhost';
  }
  static const int defaultPort = 5057;

  static String get baseUrl {
    if (customApiUrl.isNotEmpty) return customApiUrl;
    if (useLocal) return 'http://$defaultHost:$defaultPort';
    return liveBackendUrl;
  }

  // Auth endpoints (AuthController)
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refresh = '/auth/refresh';

  // User Profile (UserController)
  static const String userProfile = '/users/me';

  // Service Categories (ServiceCategoryController) — public reference data
  static const String serviceCategories = '/api/service-categories';

  // Job Requests (JobRequestController)
  static const String jobRequests = '/job-requests';
  static const String myJobRequests = '/job-requests/mine';
  static String jobRequestById(String id) => '/job-requests/$id';
  static String jobRequestWorkflow(String id) => '/job-requests/$id/workflow';

  // Bookings (BookingController)
  static const String bookings = '/bookings';
  static const String customerBookings = '/bookings/mine';
  static const String providerBookings = '/bookings/provider-mine';
  static String bookingById(String id) => '/bookings/$id';
  static String updateBookingStatus(String id) => '/bookings/$id/status';
  static String updateBookingSchedule(String id) => '/bookings/$id/schedule';

  // AI Assistant (backend-mediated endpoint per Single Public Backend rule)
  static const String assistantQuery = '/assistant/query';

  // Provider & Verification (ProviderController)
  static const String providerVerification = '/api/providers/verification';
  static const String providerProfile = '/api/providers/me'; 
  static String providerById(String id) => '/api/providers/$id';
  static const String providersSearch = '/api/providers/search';
  static const String predefinedSlots = '/api/provider-availability/slots';
  static String providerSchedule(String providerId) => '/api/provider-availability/$providerId/schedule';

  // Service Listings (ServiceListingsController)
  static const String serviceListings = '/api/service-listings';
  static String providerServiceListings(String providerId) => '/api/service-listings/provider/$providerId';

  // Invoices & Payments (InvoiceController, PaymentController, PayoutController)
  static const String invoices = '/invoices';
  static const String myInvoices = '/invoices/mine';
  static String invoiceById(String id) => '/invoices/$id';
  static String invoiceByBookingId(String bookingId) => '/invoices/booking/$bookingId';

  static const String payments = '/payments';
  static const String myPayments = '/payments/mine';
  static String paymentById(String id) => '/payments/$id';
  static String paymentByInvoiceId(String invoiceId) => '/payments/invoice/$invoiceId';

  static const String providerPayouts = '/payouts/provider';
  static const String providerPayoutSummary = '/payouts/provider/summary';
}
