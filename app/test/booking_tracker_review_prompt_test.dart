import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/data/models/agent_workflow_model.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/models/job_request_model.dart';
import 'package:app/data/models/provider_profile_model.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/job_request_repository.dart';
import 'package:app/data/repositories/payment_repository.dart';
import 'package:app/data/repositories/invoice_repository.dart';
import 'package:app/data/repositories/review_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/job_request_provider.dart';
import 'package:app/providers/payment_provider.dart';
import 'package:app/providers/review_provider.dart';
import 'package:app/screens/customer/booking_tracker_screen.dart';
import 'package:app/widgets/write_review_bottom_sheet.dart';

class StubJobRequestRepo extends Fake implements JobRequestRepository {
  final JobRequestModel request;
  StubJobRequestRepo(this.request);

  @override
  Future<List<JobRequestModel>> getMyJobRequests() async => [request];

  @override
  Future<AgentWorkflowModel?> getJobWorkflow(String requestId) async => null;
}

class StubBookingRepo extends Fake implements BookingRepository {
  final List<BookingModel> bookings;
  StubBookingRepo(this.bookings);

  @override
  Future<List<BookingModel>> getCustomerBookings() async => bookings;
}

class StubInvoiceRepo extends Fake implements InvoiceRepository {}
class StubPaymentRepo extends Fake implements PaymentRepository {}
class StubReviewRepo extends Fake implements ReviewRepository {}

void main() {
  testWidgets('BookingTrackerScreen renders Rate Specialist CTA when booking is completed', (tester) async {
    final request = JobRequestModel(
      id: 'req-123',
      serviceCategoryId: 'cat-1',
      categoryName: 'Plumbing',
      description: 'Fix pipe leak',
      location: 'Colombo 03',
      urgency: 'Medium',
      budgetMin: 2000,
      budgetMax: 5000,
      status: 'Open',
      customerId: 'cust-1',
      createdAt: DateTime.now(),
    );

    final completedBooking = BookingModel(
      id: 'book-123',
      jobRequestId: 'req-123',
      providerId: 'prov-789',
      customerId: 'cust-1',
      status: 'Completed',
      scheduledAt: DateTime.now().subtract(const Duration(hours: 1)),
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      providerName: 'Kasun Technics',
      price: 3500,
      provider: ProviderProfileModel(
        id: 'prov-789',
        userId: 'usr-789',
        fullName: 'Kasun Technics',
        serviceArea: 'Colombo',
        skillCategories: ['Plumbing'],
      ),
    );

    final jobProvider = JobRequestProvider(repository: StubJobRequestRepo(request));
    jobProvider.setCurrentTrackedRequest(request);
    final bookingProvider = BookingProvider(repository: StubBookingRepo([completedBooking]));
    final paymentProvider = PaymentProvider(
      invoiceRepo: StubInvoiceRepo(),
      paymentRepo: StubPaymentRepo(),
    );
    final reviewProvider = ReviewProvider(reviewRepo: StubReviewRepo());

    await bookingProvider.fetchCustomerBookings();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<JobRequestProvider>.value(value: jobProvider),
          ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
          ChangeNotifierProvider<PaymentProvider>.value(value: paymentProvider),
          ChangeNotifierProvider<ReviewProvider>.value(value: reviewProvider),
        ],
        child: const MaterialApp(
          home: BookingTrackerScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('tracker_rate_specialist_button')),
      300,
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('tracker_rate_specialist_button')), findsOneWidget);

    // Tap Rate Specialist
    await tester.tap(find.byKey(const Key('tracker_rate_specialist_button')));
    await tester.pumpAndSettle();

    expect(find.byType(WriteReviewBottomSheet), findsOneWidget);
  });
}
