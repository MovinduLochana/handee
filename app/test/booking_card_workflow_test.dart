import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app/core/utils/external_launcher_helper.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/widgets/booking_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ExternalLauncherHelper.urlLauncherOverride = null;
  });

  testWidgets('BookingCard renders Instant Match badge, on-demand timing banner, and quick actions', (tester) async {
    Uri? capturedUri;
    ExternalLauncherHelper.urlLauncherOverride = (uri, {mode = LaunchMode.platformDefault}) async {
      capturedUri = uri;
      return true;
    };

    final instantBooking = BookingModel(
      id: 'book-inst-1',
      providerId: 'prov-1',
      customerId: 'cust-1',
      customerName: 'Roshan Perera',
      customerPhone: '+94 77 111 2222',
      serviceLocation: 'Kollupitiya, Colombo 03',
      category: 'Emergency Plumbing',
      description: 'Burst water pipe under kitchen sink',
      price: 4500.0,
      status: 'InProgress',
      bookingType: 'InstantMatch',
      createdAt: DateTime(2026, 10, 1, 14, 30),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BookingCard(
            booking: instantBooking,
            isProviderView: true,
            onTap: () {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify Instant Match badge is rendered
    expect(find.textContaining('INSTANT DISPATCH'), findsOneWidget);

    // 2. Verify on-demand timing banner is rendered instead of generic calendar banner
    expect(find.textContaining('Dispatched:'), findsOneWidget);
    expect(find.text('On-Demand'), findsOneWidget);

    // 3. Verify quick call button invokes launcher
    final callBtn = find.byKey(const Key('card_quick_call_book-inst-1'));
    expect(callBtn, findsOneWidget);
    await tester.tap(callBtn);
    await tester.pumpAndSettle();
    expect(capturedUri.toString(), equals('tel:+94771112222'));

    // 4. Verify quick map button invokes launcher
    final mapBtn = find.byKey(const Key('card_quick_map_book-inst-1'));
    expect(mapBtn, findsOneWidget);
    await tester.tap(mapBtn);
    await tester.pumpAndSettle();
    expect(capturedUri.toString(), contains('https://www.google.com/maps/search/?api=1&query=Kollupitiya'));
  });

  testWidgets('BookingCard renders Scheduled Service badge and calendar window banner', (tester) async {
    final scheduledBooking = BookingModel(
      id: 'book-sched-1',
      providerId: 'prov-1',
      customerId: 'cust-2',
      customerName: 'Sunil Silva',
      serviceLocation: 'Bambalapitiya, Colombo 04',
      category: 'Electrical Fitting',
      description: 'Ceiling fan installation in bedroom',
      scheduledAt: DateTime(2026, 10, 5, 10, 0),
      durationHours: 2,
      price: 5000.0,
      status: 'Accepted',
      bookingType: 'Scheduled',
      createdAt: DateTime(2026, 10, 1, 9, 0),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BookingCard(
            booking: scheduledBooking,
            isProviderView: true,
            onTap: () {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify Scheduled badge is rendered
    expect(find.textContaining('SCHEDULED'), findsOneWidget);

    // 2. Verify appointment window banner is rendered with duration
    expect(find.textContaining('10:00 AM – 12:00 PM'), findsOneWidget);
    expect(find.text('2 hrs'), findsOneWidget);
  });
}
