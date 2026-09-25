/// Centralized API Endpoints for Handee ASP.NET Core Backend.
/// Matches the exact routes implemented in Handee.Api controllers.
class ApiEndpoints {
  ApiEndpoints._();

  // Base URL configuration (Supports localhost, Android Emulator 10.0.2.2, or live backend)
  // Default to emulator/localhost port 5000 (HTTP) or 5001 (HTTPS)
  static const String defaultHost = '10.0.2.2'; // Standard Android emulator alias for localhost
  static const int defaultPort = 5000;
  static const String baseUrl = 'http://$defaultHost:$defaultPort';

  // Auth endpoints (AuthController)
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refresh = '/auth/refresh';

  // User Profile (UserController)
  static const String userProfile = '/users/me';

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
  static const String providerVerification = '/provider/verification';
  static const String providerProfile = '/provider/profile';
  static String providerById(String id) => '/providers/$id';

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
