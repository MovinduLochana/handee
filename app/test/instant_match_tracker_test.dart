import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/data/models/agent_workflow_model.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/models/invoice_model.dart';
import 'package:app/data/models/job_request_model.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/invoice_repository.dart';
import 'package:app/data/repositories/job_request_repository.dart';
import 'package:app/data/repositories/payment_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/job_request_provider.dart';
import 'package:app/providers/payment_provider.dart';
import 'package:app/screens/customer/booking_tracker_screen.dart';

class FakeJobRequestRepo implements JobRequestRepository {
  JobRequestModel trackedRequest;
  AgentWorkflowModel? workflow;

  FakeJobRequestRepo({required this.trackedRequest, this.workflow});

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<JobRequestModel>> getMyJobRequests() async => [trackedRequest];

  @override
  Future<JobRequestModel?> getJobRequestById(String id) async => trackedRequest;

  @override
  Future<AgentWorkflowModel?> getJobWorkflow(String jobRequestId) async => workflow;

  @override
  Future<JobRequestModel> createJobRequest({
    required String serviceCategoryId,
    required String description,
    required String location,
    required String urgency,
    double? budgetMin,
    double? budgetMax,
    List<String> photoUrls = const [],
  }) async =>
      trackedRequest;
}

class FakeBookingRepo implements BookingRepository {
  List<BookingModel> bookings = [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<BookingModel>> getCustomerBookings() async => bookings;

  @override
  Future<List<BookingModel>> getProviderBookings() async => [];

  @override
  Future<List<BookingModel>> getProviderBookingRequests() async => [];

  @override
  Future<BookingModel?> getBookingById(String id) async =>
      bookings.cast<BookingModel?>().firstWhere((b) => b?.id == id, orElse: () => null);
}

class FakeInvoiceRepo implements InvoiceRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<InvoiceModel?> getInvoiceByBookingId(String bookingId) async => null;
}

class FakePaymentRepo implements PaymentRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('BookingTrackerScreen clarifies provider acceptance is pending in Instant Match', (tester) async {
    final sampleRequest = JobRequestModel(
      id: 'job-req-instant-100',
      serviceCategoryId: 'cat-elec',
      categoryName: 'Electrical Repair',
      description: 'Power socket sparked',
      location: 'Colombo 03',
      urgency: 'Emergency',
      status: 'Open',
      customerId: 'cust-1',
      createdAt: DateTime.now(),
    );

    final sampleWorkflow = AgentWorkflowModel(
      id: 'wf-1',
      jobRequestId: sampleRequest.id,
      workflowId: 'wf-exec-1',
      objective: 'Emergency Electrical dispatch',
      plan: ['Analyze', 'Validate', 'Match'],
      validationTier: 'approved_for_auto_dispatch',
      approvalStatus: 'approved',
      estimatedPrice: 3500.0,
      selectedProviderId: 'prov-001',
      selectedProviderName: 'Kamal Perera',
      createdAt: DateTime.now(),
      stepLogs: [],
    );

    // Initial state: booking created in Requested status (awaiting provider acceptance)
    final instantBookingPending = BookingModel(
      id: 'book-instant-1',
      jobRequestId: sampleRequest.id,
      providerId: 'prov-001',
      providerName: 'Kamal Perera',
      customerId: 'cust-1',
      status: 'Requested',
      bookingType: 'InstantMatch',
      createdAt: DateTime.now(),
    );

    final jobRepo = FakeJobRequestRepo(trackedRequest: sampleRequest, workflow: sampleWorkflow);
    final bookingRepo = FakeBookingRepo()..bookings = [instantBookingPending];
    final invoiceRepo = FakeInvoiceRepo();
    final paymentRepo = FakePaymentRepo();

    final jobProvider = JobRequestProvider(repository: jobRepo);
    jobProvider.setCurrentTrackedRequest(sampleRequest);
    await jobProvider.fetchWorkflowForTrackedRequest();

    final bookingProvider = BookingProvider(repository: bookingRepo);
    await bookingProvider.fetchCustomerBookings();

    final paymentProvider = PaymentProvider(invoiceRepo: invoiceRepo, paymentRepo: paymentRepo);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<JobRequestProvider>.value(value: jobProvider),
          ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
          ChangeNotifierProvider<PaymentProvider>.value(value: paymentProvider),
        ],
        child: const MaterialApp(
          home: BookingTrackerScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify timeline step 3 indicates dispatched & awaiting acceptance (NOT confirmed/ready)
    expect(find.text('3. Dispatched — Awaiting Acceptance'), findsOneWidget);
    expect(find.textContaining('Offer dispatched to Kamal Perera — waiting for provider to accept'), findsOneWidget);

    // 2. Verify banner communicates that provider acceptance is pending
    expect(find.textContaining('Waiting for the provider to accept the request before the booking is confirmed'), findsOneWidget);
    expect(find.textContaining('A booking has been created for your provider.'), findsNothing);

    // 3. Verify payment card indicates payment unlocks once provider accepts
    expect(find.textContaining('Payment unlocks once Kamal Perera accepts the booking request.'), findsOneWidget);
    expect(find.text('Pay Securely Now'), findsNothing);
  });

  testWidgets('BookingTrackerScreen updates to confirmed once provider accepts instant match', (tester) async {
    final sampleRequest = JobRequestModel(
      id: 'job-req-instant-200',
      serviceCategoryId: 'cat-elec',
      categoryName: 'Electrical Repair',
      description: 'Power socket sparked',
      location: 'Colombo 03',
      urgency: 'Emergency',
      status: 'Open',
      customerId: 'cust-1',
      createdAt: DateTime.now(),
    );

    final sampleWorkflow = AgentWorkflowModel(
      id: 'wf-2',
      jobRequestId: sampleRequest.id,
      workflowId: 'wf-exec-2',
      objective: 'Emergency Electrical dispatch',
      plan: ['Analyze', 'Validate', 'Match'],
      validationTier: 'approved_for_auto_dispatch',
      approvalStatus: 'approved',
      estimatedPrice: 3500.0,
      selectedProviderId: 'prov-001',
      selectedProviderName: 'Kamal Perera',
      createdAt: DateTime.now(),
      stepLogs: [],
    );

    // Provider has accepted the booking!
    final instantBookingAccepted = BookingModel(
      id: 'book-instant-2',
      jobRequestId: sampleRequest.id,
      providerId: 'prov-001',
      providerName: 'Kamal Perera',
      customerId: 'cust-1',
      status: 'Accepted',
      bookingType: 'InstantMatch',
      createdAt: DateTime.now(),
    );

    final jobRepo = FakeJobRequestRepo(trackedRequest: sampleRequest, workflow: sampleWorkflow);
    final bookingRepo = FakeBookingRepo()..bookings = [instantBookingAccepted];
    final invoiceRepo = FakeInvoiceRepo();
    final paymentRepo = FakePaymentRepo();

    final jobProvider = JobRequestProvider(repository: jobRepo);
    jobProvider.setCurrentTrackedRequest(sampleRequest);
    await jobProvider.fetchWorkflowForTrackedRequest();

    final bookingProvider = BookingProvider(repository: bookingRepo);
    await bookingProvider.fetchCustomerBookings();

    final paymentProvider = PaymentProvider(invoiceRepo: invoiceRepo, paymentRepo: paymentRepo);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<JobRequestProvider>.value(value: jobProvider),
          ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
          ChangeNotifierProvider<PaymentProvider>.value(value: paymentProvider),
        ],
        child: const MaterialApp(
          home: BookingTrackerScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify timeline step 3 indicates confirmed
    expect(find.text('3. Provider Accepted & Confirmed'), findsOneWidget);
    expect(find.textContaining('Kamal Perera accepted your request! Service confirmed.'), findsOneWidget);

    // 2. Verify banner confirms acceptance
    expect(find.textContaining('Provider accepted! Your booking is confirmed with Kamal Perera.'), findsOneWidget);

    // 3. Verify payment is unlocked
    expect(find.text('Pay Securely Now'), findsOneWidget);
  });
}
