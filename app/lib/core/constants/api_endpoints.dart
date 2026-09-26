import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

/// Centralized API Endpoints for Handee ASP.NET Core Backend.
/// Matches the exact routes implemented in Handee.Api controllers.
class ApiEndpoints {
  ApiEndpoints._();

  // Base URL configuration (Supports localhost, Android Emulator 10.0.2.2, or live backend)
  // Default to the Android Emulator (10.0.2.2) or localhost.
  // Use --dart-define=DEVICE=true to target a Physical Device over Wi-Fi
  // Optional: --dart-define=DEVICE_IP=192.168.1.x or --dart-define=BASE_URL=http://...
  static const bool usePhysicalDevice = bool.fromEnvironment('DEVICE', defaultValue: false);
  static const String physicalDeviceIp = String.fromEnvironment('DEVICE_IP', defaultValue: '192.168.1.2');
  static const String customBaseUrl = String.fromEnvironment('BASE_URL', defaultValue: '');
  static const int defaultPort = int.fromEnvironment('PORT', defaultValue: 5057);

  static String get defaultHost {
    if (kIsWeb) return 'localhost';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return usePhysicalDevice ? physicalDeviceIp : '10.0.2.2';
    }
    return usePhysicalDevice ? physicalDeviceIp : 'localhost';
  }

  static String get baseUrl {
    if (customBaseUrl.isNotEmpty) return customBaseUrl;
    return 'http://$defaultHost:$defaultPort';
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
  static String providerAvailability(String providerId) => '/api/provider-availability/$providerId';

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
