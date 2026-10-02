import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/models/provider_profile_model.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/invoice_repository.dart';
import 'package:app/data/repositories/payment_repository.dart';
import 'package:app/data/repositories/provider_availability_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/payment_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/screens/shared/booking_detail_screen.dart';
import 'package:app/screens/customer/public_provider_profile_screen.dart';
import 'package:app/widgets/predefined_slot_picker.dart';

class MockBookingRepository implements BookingRepository {
  final BookingModel booking;
  DateTime? lastRescheduledTime;

  MockBookingRepository(this.booking);

  @override
  late ApiClient apiClient;

  @override
  Future<BookingModel> createBookingFromListing({
    required String serviceListingId,
    required DateTime scheduledAt,
    String? notes,
  }) async => booking;

  @override
  Future<List<BookingModel>> getCustomerBookings() async => [booking];

  @override
  Future<List<BookingModel>> getProviderBookings() async => [booking];

  @override
  Future<BookingModel?> getBookingById(String id) async => booking;

  @override
  Future<BookingModel> updateBookingSchedule(String bookingId, DateTime scheduledAt) async {
    lastRescheduledTime = scheduledAt;
    return BookingModel(
      id: booking.id,
      providerId: booking.providerId,
      customerId: booking.customerId,
      status: booking.status,
      scheduledAt: scheduledAt,
      createdAt: booking.createdAt,
      provider: booking.provider,
      providerName: booking.providerName,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      category: booking.category,
      description: booking.description,
      notes: booking.notes,
      price: booking.price,
      serviceLocation: booking.serviceLocation,
    );
  }

  @override
  Future<BookingModel> updateBookingStatus(String bookingId, String newStatus) async => booking;

  @override
  Future<List<BookingModel>> getProviderBookingRequests() async => [booking];

  @override
  Future<BookingModel> confirmBooking(String bookingId) async => booking;

  @override
  Future<BookingModel> declineBooking(String bookingId, {String? reason}) async => booking;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'dummy-token',
      'user_id': 'user-123',
      'user_email': 'kasun@handee.lk',
      'user_name': 'Kasun Perera',
      'user_role': 'Customer',
    });
    storage = await StorageService.getInstance();
  });

  Widget buildTestWidget({
    required BookingModel booking,
    MockBookingRepository? mockRepo,
  }) {
    final client = ApiClient(storage: storage);
    final repo = mockRepo ?? MockBookingRepository(booking);
    final bookingProvider = BookingProvider(repository: repo);
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

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<PaymentProvider>.value(value: paymentProvider),
        ChangeNotifierProvider<ServiceDirectoryProvider>.value(value: serviceDirectoryProvider),
        Provider<ProviderAvailabilityRepository>.value(value: availabilityRepo),
      ],
      child: MaterialApp(
        home: BookingDetailScreen(
          bookingId: booking.id,
          initialBooking: booking,
        ),
      ),
    );
  }

  final testBooking = BookingModel(
    id: 'b-999-xyz',
    providerId: 'prov-456',
    customerId: 'cust-123',
    status: 'Requested',
    scheduledAt: DateTime.utc(2026, 10, 15, 10, 0),
    createdAt: DateTime.utc(2026, 10, 10, 9, 30),
    category: 'Electrical Repair',
    description: 'Fix tripping circuit breaker',
    providerName: 'Sunil Rajapaksha',
    provider: ProviderProfileModel(
      id: 'prof-456',
      userId: 'user-prov-456',
      fullName: 'Sunil Rajapaksha',
      skillCategories: ['Electrical'],
      serviceArea: 'Colombo',
      rating: 4.7,
      totalReviews: 18,
      completedJobs: 42,
    ),
    notes: 'Please bring an insulated screwdriver and call before ringing gate.',
    serviceLocation: '45 Galle Road, Colombo 03',
    price: 3500.0,
  );

  testWidgets('BookingDetailScreen renders real provider data and no hardcoded values', (tester) async {
    await tester.pumpWidget(buildTestWidget(booking: testBooking));
    await tester.pumpAndSettle();

    // Verify Real Provider name appears
    expect(find.text('Sunil Rajapaksha'), findsWidgets);
    // Verify Hardcoded fallback name DOES NOT appear
    expect(find.text('Nimal Jayawardena'), findsNothing);

    // Verify Real Rating & Review count appears
    expect(find.textContaining('★ 4.7 (18 reviews)'), findsOneWidget);
    // Verify Hardcoded 4.9 rating does not appear
    expect(find.textContaining('★ 4.9'), findsNothing);

    // Verify Assigned Party header
    expect(find.text('Assigned Service Provider'), findsOneWidget);
    expect(find.text('View Profile ›'), findsOneWidget);
  });

  testWidgets('BookingDetailScreen renders 1-hour dynamic time slot system correctly', (tester) async {
    await tester.pumpWidget(buildTestWidget(booking: testBooking));
    await tester.pumpAndSettle();

    // Verify 1-Hour slot badge
    expect(find.text('1-Hour Slot'), findsOneWidget);
    expect(find.text('Time Slot & Schedule'), findsOneWidget);

    // Verify 1-hour time window (10:00 AM – 11:00 AM)
    expect(find.textContaining('10:00 AM – 11:00 AM'), findsOneWidget);

    // Verify Reschedule button is visible since status is Requested
    expect(find.text('Reschedule Time Slot'), findsOneWidget);
  });

  testWidgets('BookingDetailScreen accurately takes into account multiple time slots (durationHours > 1)', (tester) async {
    final multiSlotBooking = testBooking.copyWith(
      durationHours: 2,
    );
    await tester.pumpWidget(buildTestWidget(booking: multiSlotBooking));
    await tester.pumpAndSettle();

    // Verify 2-Hour Window badge
    expect(find.text('2 Hours (2 Slots)'), findsOneWidget);

    // Verify 2-hour time window (10:00 AM – 12:00 PM)
    expect(find.textContaining('10:00 AM – 12:00 PM'), findsOneWidget);

    // Verify explanation text for multi-slot booking
    expect(find.text('Confirmed reservation spans 2 consecutive 1-hour time slots.'), findsOneWidget);

    // Verify Reschedule button shows window duration
    expect(find.text('Reschedule (2-Hour Window)'), findsOneWidget);
  });

  testWidgets('BookingDetailScreen renders Customer Notes & Instructions if present', (tester) async {
    await tester.pumpWidget(buildTestWidget(booking: testBooking));
    await tester.pumpAndSettle();

    expect(find.text('Customer Instructions & Notes'), findsOneWidget);
    expect(
      find.text('Please bring an insulated screwdriver and call before ringing gate.'),
      findsOneWidget,
    );
  });

  testWidgets('BookingDetailScreen renders Service Location if present', (tester) async {
    await tester.pumpWidget(buildTestWidget(booking: testBooking));
    await tester.pumpAndSettle();

    expect(find.text('Service Location'), findsOneWidget);
    expect(find.text('45 Galle Road, Colombo 03'), findsOneWidget);
  });

  testWidgets('Tapping Assigned Provider navigates to PublicProviderProfileScreen', (tester) async {
    await tester.pumpWidget(buildTestWidget(booking: testBooking));
    await tester.pumpAndSettle();

    // Tap on Assigned Provider card
    await tester.tap(find.text('Sunil Rajapaksha').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Should find PublicProviderProfileScreen pushed
    expect(find.byType(PublicProviderProfileScreen), findsOneWidget);
  });

  testWidgets('Tapping Reschedule opens bottom sheet with PredefinedSlotPicker', (tester) async {
    await tester.pumpWidget(buildTestWidget(booking: testBooking));
    await tester.pumpAndSettle();

    // Tap Reschedule button
    await tester.tap(find.text('Reschedule Time Slot'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify bottom sheet title
    expect(find.text('Reschedule Appointment'), findsOneWidget);
    expect(find.textContaining('Current:'), findsOneWidget);

    // Verify PredefinedSlotPicker is loaded in bottom sheet
    expect(find.byType(PredefinedSlotPicker), findsOneWidget);
    expect(find.text('Confirm Reschedule'), findsOneWidget);
  });
}
