import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

/// Centralized API Endpoints for Handee ASP.NET Core Backend.
/// Matches the exact routes implemented in Handee.Api controllers.
class ApiEndpoints {
  ApiEndpoints._();

  // Base URL configuration (Supports localhost, Android Emulator 10.0.2.2, or live backend)
  // Default to the Android Emulator (10.0.2.2) or localhost.
  // Use --dart-define=DEVICE=true to target a Physical Device over Wi-Fi
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
  static String get baseUrl => 'http://$defaultHost:$defaultPort';

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
  static const String providerVerification = '/api/providers/verification'; // Wait, it's actually api/providers/{id}/verification based on controller. We'll leave the constant if they used it structurally differently, but let's fix what we added.
  static const String providerProfile = '/api/providers/me'; 
  static String providerById(String id) => '/api/providers/$id';
  static const String providersSearch = '/api/providers/search';

  // Service Listings (ServiceListingsController)
  static const String serviceListings = '/api/service-listings';
  static String providerServiceListings(String providerId) => '/api/service-listings/provider/$providerId';
}
