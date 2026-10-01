import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/widgets/booking_card.dart';

void main() {
  group('BookingCard Widget Tests', () {
    testWidgets('renders all rich booking details: category, schedule window, description, location, notes, provider, price', (tester) async {
      bool tapped = false;
      final scheduledDate = DateTime.utc(2026, 10, 15, 10, 0);

      final booking = BookingModel(
        id: 'book-123',
        providerId: 'prov-001',
        customerId: 'cust-001',
        status: 'Accepted',
        category: 'Electrical Wiring',
        description: 'Complete ceiling rewiring and breaker check.',
        scheduledAt: scheduledDate,
        durationHours: 2,
        serviceLocation: 'No 45, Galle Road, Colombo 03',
        notes: 'Please bring an extra extension cord',
        providerName: 'Sunil Perera',
        price: 4500.0,
        createdAt: DateTime.utc(2026, 10, 14, 8, 30),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BookingCard(
              booking: booking,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Category and Status
      expect(find.text('Electrical Wiring'), findsOneWidget);
      expect(find.text('Provider Assigned'), findsOneWidget); // StatusBadge label for Accepted

      // Schedule window banner
      expect(find.textContaining('Thu, 15 Oct'), findsOneWidget);
      expect(find.textContaining('10:00 AM – 12:00 PM'), findsOneWidget);
      expect(find.text('2 hrs'), findsOneWidget);

      // Description
      expect(find.text('Complete ceiling rewiring and breaker check.'), findsOneWidget);

      // Location & Notes
      expect(find.text('No 45, Galle Road, Colombo 03'), findsOneWidget);
      expect(find.text('Note: "Please bring an extra extension cord"'), findsOneWidget);

      // Assigned provider and price
      expect(find.text('Provider'), findsOneWidget);
      expect(find.text('Sunil Perera'), findsOneWidget);
      expect(find.text('S'), findsOneWidget); // Avatar initial
      expect(find.text('Rs. 4,500'), findsOneWidget);

      // Tap card
      await tester.tap(find.byType(BookingCard));
      expect(tapped, isTrue);
    });

    testWidgets('renders unscheduled state properly when scheduledAt is null', (tester) async {
      final booking = BookingModel(
        id: 'book-456',
        providerId: 'prov-001',
        customerId: 'cust-001',
        status: 'Requested',
        category: 'Plumbing Repair',
        description: 'Fix kitchen pipe leak.',
        scheduledAt: null,
        durationHours: 1,
        providerName: 'Kasun Dias',
        price: 2500.0,
        createdAt: DateTime.utc(2026, 10, 14, 8, 30),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BookingCard(
              booking: booking,
              onTap: () {},
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Plumbing Repair'), findsOneWidget);
      expect(find.text('Not scheduled yet'), findsOneWidget);
    });

    testWidgets('renders customer details when isProviderView is true', (tester) async {
      final booking = BookingModel(
        id: 'book-789',
        providerId: 'prov-001',
        customerId: 'cust-001',
        status: 'InProgress',
        category: 'Appliance Repair',
        description: 'Washing machine motor fix',
        scheduledAt: DateTime.utc(2026, 10, 16, 14, 0),
        durationHours: 1,
        customerName: 'Anura Fernando',
        price: 6000.0,
        createdAt: DateTime.utc(2026, 10, 14, 8, 30),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BookingCard(
              booking: booking,
              isProviderView: true,
              onTap: () {},
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Customer'), findsOneWidget);
      expect(find.text('Anura Fernando'), findsOneWidget);
      expect(find.text('A'), findsOneWidget); // Customer avatar initial
      expect(find.text('In Progress'), findsOneWidget);
    });
  });
}
