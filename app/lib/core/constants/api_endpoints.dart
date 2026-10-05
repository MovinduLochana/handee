import 'package:flutter/foundation.dart' show debugPrint, kIsWeb, defaultTargetPlatform, TargetPlatform;

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
  static const String physicalDeviceIp = '192.168.1.2';

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

  /// Live deployed Python AI Agent Service URL (matches React Web client)
  static const String liveAgentServiceUrl = 'https://handee-production.up.railway.app';
  static const String customAgentUrl = String.fromEnvironment('AGENT_URL', defaultValue: '');

  static String get agentBaseUrl {
    if (customAgentUrl.isNotEmpty) return customAgentUrl;
    if (useLocal) return 'http://$defaultHost:8000';
    return liveAgentServiceUrl;
  }

  /// Logs a prominent diagnostic banner on application spin-up
  static void logStartupConfiguration() {
    final activeUrl = baseUrl;
    final isLocal = activeUrl.contains('localhost') ||
                    activeUrl.contains('10.0.2.2') ||
                    (usePhysicalDevice && activeUrl.contains(physicalDeviceIp));
    final targetLabel = isLocal ? '[LOCAL BACKEND]' : '[DEPLOYED AZURE CLOUD]';

    debugPrint('================================================================');
    debugPrint('📱  HANDEE FLUTTER MOBILE APP STARTING UP');
    debugPrint('================================================================');
    debugPrint(' 🎯 Target Backend : $targetLabel $activeUrl');
    debugPrint(' ⚙️  Flags          : USE_LOCAL=$useLocal | DEVICE=$usePhysicalDevice');
    if (isLocal) {
      debugPrint(' 🌐 Host Routing   : $defaultHost:$defaultPort');
      if (defaultTargetPlatform == TargetPlatform.android && !usePhysicalDevice) {
        debugPrint(' 🤖 Android Note   : 10.0.2.2 routes to host machine localhost:5057');
      }
    } else {
      debugPrint(' ☁️  Cloud Note     : Connected to Azure Web App & Neon Tech PostgreSQL');
    }
    debugPrint(' 💡 Run local via  : flutter run --dart-define=USE_LOCAL=true');
    debugPrint('================================================================');
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
  static const String providerInstantOffers = '/api/provider/instant-offers';
  static const String providerBookingRequests = '/api/provider/booking-requests';
  static String bookingById(String id) => '/bookings/$id';
  static String updateBookingStatus(String id) => '/bookings/$id/status';
  static String updateBookingSchedule(String id) => '/bookings/$id/schedule';
  static String confirmBooking(String id) => '/api/provider/bookings/$id/confirm';
  static String declineBooking(String id) => '/api/provider/bookings/$id/decline';

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
  static String payHereParams(String invoiceId) => '/api/payments/$invoiceId/payhere-params';
  static String payHereCheckoutHtml(String invoiceId) => '$baseUrl/api/payments/$invoiceId/payhere-checkout-html';
  static const String payHereConfirm = '/api/payments/payhere-confirm';

  static const String providerPayouts = '/api/payouts/history';
  static const String providerPayoutSummary = '/api/payouts/summary';
  static String providerPayoutsByProvider(String providerId) => '/api/payouts/provider/$providerId';
  static String providerPayoutSummaryByProvider(String providerId) => '/api/payouts/provider/$providerId/summary';
}

