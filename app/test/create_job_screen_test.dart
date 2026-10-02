import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/models/invoice_model.dart';
import 'package:app/data/models/job_request_model.dart';
import 'package:app/data/models/service_category_model.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/invoice_repository.dart';
import 'package:app/data/repositories/job_request_repository.dart';
import 'package:app/data/repositories/payment_repository.dart';
import 'package:app/data/repositories/service_category_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/job_request_provider.dart';
import 'package:app/providers/payment_provider.dart';
import 'package:app/screens/customer/create_job_screen.dart';

class FakeServiceCategoryRepo implements ServiceCategoryRepository {
  final List<ServiceCategoryModel> categories;

  FakeServiceCategoryRepo(this.categories);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<ServiceCategoryModel>> getCategories() async => categories;
}

class FakeJobRequestRepo implements JobRequestRepository {
  JobRequestModel? lastCreated;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<JobRequestModel> createJobRequest({
    required String serviceCategoryId,
    required String description,
    required String location,
    required String urgency,
    double? budgetMin,
    double? budgetMax,
    List<String> photoUrls = const [],
  }) async {
    lastCreated = JobRequestModel(
      id: 'job-123',
      serviceCategoryId: serviceCategoryId,
      categoryName: 'Plumbing',
      description: description,
      urgency: urgency,
      location: location,
      budgetMin: budgetMin,
      budgetMax: budgetMax,
      status: 'PendingAiReview',
      customerId: 'cust-1',
      createdAt: DateTime.now(),
    );
    return lastCreated!;
  }
}

class FakeBookingRepo implements BookingRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<BookingModel>> getCustomerBookings() async => [];
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

Widget createTestWidget({
  required FakeServiceCategoryRepo categoryRepo,
  required FakeJobRequestRepo jobRepo,
  String? initialCategory,
}) {
  return MultiProvider(
    providers: [
      Provider<ServiceCategoryRepository>.value(value: categoryRepo),
      ChangeNotifierProvider<JobRequestProvider>(
        create: (_) => JobRequestProvider(repository: jobRepo),
      ),
      ChangeNotifierProvider<BookingProvider>(
        create: (_) => BookingProvider(repository: FakeBookingRepo()),
      ),
      ChangeNotifierProvider<PaymentProvider>(
        create: (_) => PaymentProvider(
          invoiceRepo: FakeInvoiceRepo(),
          paymentRepo: FakePaymentRepo(),
        ),
      ),
    ],
    child: MaterialApp(
      home: CreateJobScreen(initialCategory: initialCategory),
    ),
  );
}

void main() {
  late List<ServiceCategoryModel> testCategories;
  late FakeServiceCategoryRepo categoryRepo;
  late FakeJobRequestRepo jobRepo;

  setUp(() {
    testCategories = [
      ServiceCategoryModel(
        id: 'cat-plumb-1',
        name: 'Plumbing',
        priceBandMin: 2500,
        priceBandMax: 8000,
      ),
      ServiceCategoryModel(
        id: 'cat-elect-2',
        name: 'Electrical',
        priceBandMin: 3000,
        priceBandMax: 10000,
      ),
    ];
    categoryRepo = FakeServiceCategoryRepo(testCategories);
    jobRepo = FakeJobRequestRepo();
  });

  void setTestViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  testWidgets('Renders Step 1 with visual categories, problem chips, and progress bar', (tester) async {
    setTestViewport(tester);

    await tester.pumpWidget(createTestWidget(
      categoryRepo: categoryRepo,
      jobRepo: jobRepo,
    ));
    await tester.pumpAndSettle();

    // Verify progress header shows Step 1
    expect(find.text('STEP 1 OF 4'), findsOneWidget);
    expect(find.text('Category & Issue'), findsOneWidget);

    // Verify category cards
    expect(find.text('Plumbing'), findsOneWidget);
    expect(find.text('Electrical'), findsOneWidget);
    expect(find.text('From Rs. 2500'), findsOneWidget);

    // Verify problem chips for Plumbing
    expect(find.text('Burst Pipe / Active Leak'), findsOneWidget);

    // Verify Continue button
    expect(find.text('Continue'), findsOneWidget);
  });

  testWidgets('Validation blocks advancing if description is under 10 characters', (tester) async {
    setTestViewport(tester);

    await tester.pumpWidget(createTestWidget(
      categoryRepo: categoryRepo,
      jobRepo: jobRepo,
    ));
    await tester.pumpAndSettle();

    // Try tapping Continue with empty description
    await tester.tap(find.text('Continue'));
    await tester.pump();

    // Verify snackbar validation message appears
    expect(find.text('Please describe the problem in at least 10 characters'), findsOneWidget);
    // Still on step 1
    expect(find.text('STEP 1 OF 4'), findsOneWidget);
  });

  testWidgets('Problem chip tap auto-populates description and allows step progression', (tester) async {
    setTestViewport(tester);

    await tester.pumpWidget(createTestWidget(
      categoryRepo: categoryRepo,
      jobRepo: jobRepo,
    ));
    await tester.pumpAndSettle();

    // Tap a problem chip
    await tester.tap(find.text('Burst Pipe / Active Leak'));
    await tester.pumpAndSettle();

    // Description now contains the chip text
    expect(find.textContaining('Burst Pipe / Active Leak:'), findsOneWidget);

    // Tap Continue - now >= 10 chars, should advance to Step 2
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Verify now on Step 2
    expect(find.text('STEP 2 OF 4'), findsOneWidget);
    expect(find.text('Location & Access'), findsOneWidget);
    expect(find.text('Pinned Service Address'), findsOneWidget);
    expect(find.textContaining('Colombo 03'), findsOneWidget);
  });

  testWidgets('Navigates backwards and forwards across steps smoothly', (tester) async {
    setTestViewport(tester);

    await tester.pumpWidget(createTestWidget(
      categoryRepo: categoryRepo,
      jobRepo: jobRepo,
    ));
    await tester.pumpAndSettle();

    // Step 1: fill description
    await tester.enterText(find.byType(TextFormField).first, 'Water pipe broken in kitchen sink');
    await tester.pumpAndSettle();

    // Step 1 -> Step 2
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('STEP 2 OF 4'), findsOneWidget);

    // Step 2: verify back button exists
    expect(find.text('Back'), findsOneWidget);

    // Tap Back -> returns to Step 1
    await tester.tap(find.text('Back'));
    await tester.pumpAndSettle();
    expect(find.text('STEP 1 OF 4'), findsOneWidget);

    // Step 1 -> Step 2 again
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('STEP 2 OF 4'), findsOneWidget);

    // Step 2 -> Step 3
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('STEP 3 OF 4'), findsOneWidget);
    expect(find.text('Urgency & Budget'), findsOneWidget);
    expect(find.text('Select Urgency Level'), findsOneWidget);
    expect(find.text('Emergency'), findsOneWidget);
    expect(find.text('30 – 60 Min'), findsOneWidget);

    // Step 3 -> Step 4 (Review)
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('STEP 4 OF 4'), findsOneWidget);
    expect(find.text('Review & Confirm'), findsOneWidget);
    expect(find.text('SERVICE CATEGORY'), findsOneWidget);
    expect(find.text('Confirm & Dispatch Pro'), findsOneWidget);
  });

  testWidgets('Submitting on Step 4 calls submitInstantMatch with correct payload', (tester) async {
    setTestViewport(tester);

    await tester.pumpWidget(createTestWidget(
      categoryRepo: categoryRepo,
      jobRepo: jobRepo,
    ));
    await tester.pumpAndSettle();

    // Step 1: fill description
    await tester.enterText(find.byType(TextFormField).first, 'Bathroom tap is completely broken and leaking');
    await tester.pumpAndSettle();

    // Move to Step 2
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Step 2: enter landmark into the landmark field
    final textFieldsStep2 = find.byType(TextFormField);
    if (textFieldsStep2.evaluate().isNotEmpty) {
      await tester.enterText(textFieldsStep2.last, 'Keells Super lane');
      await tester.pumpAndSettle();
    }

    // Move to Step 3
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Step 3: select Emergency
    await tester.tap(find.text('Emergency'));
    await tester.pumpAndSettle();

    // Move to Step 4
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Confirm & Dispatch Pro
    await tester.tap(find.text('Confirm & Dispatch Pro'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify repository received the call
    expect(jobRepo.lastCreated, isNotNull);
    expect(jobRepo.lastCreated!.serviceCategoryId, equals('cat-plumb-1'));
    expect(jobRepo.lastCreated!.urgency, equals('Emergency'));
    expect(jobRepo.lastCreated!.description, equals('Bathroom tap is completely broken and leaking'));
    expect(jobRepo.lastCreated!.location, contains('Colombo 03'));
  });

  testWidgets('RangeSlider handles category with high minimum price band without assertion failure', (tester) async {
    setTestViewport(tester);

    final highCategoryRepo = FakeServiceCategoryRepo([
      ServiceCategoryModel(
        id: 'cat-paint-high',
        name: 'Painting',
        priceBandMin: 15000,
        priceBandMax: 45000,
      ),
    ]);

    await tester.pumpWidget(createTestWidget(
      categoryRepo: highCategoryRepo,
      jobRepo: jobRepo,
    ));
    await tester.pumpAndSettle();

    // Step 1: fill description
    await tester.enterText(find.byType(TextFormField).first, 'Full exterior house painting requested');
    await tester.pumpAndSettle();

    // Move to Step 2
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Move to Step 3 (Urgency & Budget RangeSlider)
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // Verify RangeSlider is rendered and no assertion was thrown
    expect(find.byType(RangeSlider), findsOneWidget);
    expect(find.text('Urgency & Budget'), findsOneWidget);
    expect(find.textContaining('Rs.'), findsWidgets);
  });
}
