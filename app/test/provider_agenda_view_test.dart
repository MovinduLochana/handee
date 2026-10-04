import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/screens/provider/provider_jobs_screen.dart';
import 'package:app/screens/provider/widgets/provider_agenda_view.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final fixedDate = DateTime(2026, 10, 10, 10, 0); // 10:00 AM on Oct 10, 2026

  final sampleBooking = BookingModel(
    id: 'book-agenda-1',
    providerId: 'prov-1',
    customerId: 'cust-1',
    customerName: 'Nimal Jayawardena',
    category: 'Electrical Wiring',
    serviceLocation: 'Kollupitiya, Colombo 03',
    scheduledAt: fixedDate,
    durationHours: 2,
    price: 6000.0,
    status: 'Accepted',
    bookingType: 'Scheduled',
    createdAt: DateTime.now(),
  );

  group('ProviderAgendaView Widget Tests', () {
    testWidgets('renders date selector strip and 8 AM - 8 PM chronological timeline blocks', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProviderAgendaView(
              bookings: [sampleBooking],
              initialDate: DateTime(2026, 10, 10),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify date header contains October 10
      expect(find.textContaining('Saturday, Oct 10'), findsOneWidget);

      // Verify morning and afternoon hours exist in timeline
      expect(find.text('8 AM'), findsOneWidget);
      expect(find.text('9 AM'), findsOneWidget);
      expect(find.text('10 AM'), findsOneWidget);
      expect(find.text('11 AM'), findsOneWidget);

      // Verify booking block is rendered at 10 AM
      expect(find.text('Electrical Wiring'), findsOneWidget);
      expect(find.text('Nimal Jayawardena'), findsOneWidget);
      expect(find.textContaining('10:00 AM – 12:00 PM'), findsOneWidget);
      expect(find.textContaining('(2 hrs)'), findsOneWidget);
      expect(find.text('Kollupitiya, Colombo 03'), findsOneWidget);

      // Verify 11 AM shows multi-hour continuation
      expect(find.textContaining('↳ Continuing: Electrical Wiring'), findsOneWidget);

      // Verify open slots exist for unbooked hours
      expect(find.text('Open Availability Slot'), findsWidgets);
    });

    testWidgets('shows day fully open when selecting a date with no bookings', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProviderAgendaView(
              bookings: [sampleBooking],
              initialDate: DateTime(2026, 10, 10),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Initially on Oct 10, 1 booking is reported
      expect(find.text('1 booking'), findsOneWidget);

      // Tap on next day (e.g. 11th) in the horizontal date strip
      final day11 = find.text('11');
      expect(day11, findsOneWidget);
      await tester.tap(day11);
      await tester.pumpAndSettle();

      // Oct 11 has no bookings
      expect(find.text('Sunday, Oct 11'), findsOneWidget);
      expect(find.text('Day fully open'), findsOneWidget);
      expect(find.text('Electrical Wiring'), findsNothing);
    });

    testWidgets('triggers onBookingTap callback when tapping a booking timeline block', (tester) async {
      BookingModel? tappedBooking;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProviderAgendaView(
              bookings: [sampleBooking],
              initialDate: DateTime(2026, 10, 10),
              onBookingTap: (b) => tappedBooking = b,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final bookingCard = find.text('Electrical Wiring');
      expect(bookingCard, findsOneWidget);

      await tester.tap(bookingCard);
      await tester.pumpAndSettle();

      expect(tappedBooking, isNotNull);
      expect(tappedBooking!.id, equals('book-agenda-1'));
    });
  });

  group('ProviderJobsScreen View Toggle Tests', () {
    testWidgets('toggles between list card view and ProviderAgendaView timeline', (tester) async {
      SharedPreferences.setMockInitialValues({
        'auth_access_token': 'token',
        'user_id': 'prov-1',
      });
      final storage = await StorageService.getInstance();

      final confirmedBooking = {
        'id': 'book-sched-777',
        'customerId': 'cust-1',
        'customerName': 'Nimal Jayawardena',
        'providerId': 'prov-1',
        'serviceLocation': 'Kollupitiya',
        'category': 'Electrical Wiring',
        'scheduledAt': DateTime.now().toIso8601String(),
        'price': 6000.0,
        'status': 'Accepted',
        'bookingType': 'Scheduled',
        'createdAt': DateTime.now().toIso8601String(),
      };

      final mockClient = MockClient((req) async {
        if (req.url.path == '/bookings/provider-mine') {
          return http.Response(jsonEncode([confirmedBooking]), 200);
        }
        return http.Response('[]', 200);
      });

      final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
      final repo = BookingRepository(apiClient: apiClient);
      final provider = BookingProvider(repository: repo);

      await provider.fetchProviderBookings();

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<BookingProvider>.value(
            value: provider,
            child: const ProviderJobsScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Initially in card list view: TabBar is visible
      expect(find.textContaining('Requests (0)'), findsOneWidget);
      expect(find.textContaining('Upcoming (1)'), findsOneWidget);

      // Tap the Agenda toggle button in the AppBar
      final toggleBtn = find.byKey(const Key('toggle_agenda_view_button'));
      expect(toggleBtn, findsOneWidget);
      await tester.tap(toggleBtn);
      await tester.pumpAndSettle();

      // Now in Agenda view: TabBar is hidden and ProviderAgendaView is rendered
      expect(find.textContaining('Requests (0)'), findsNothing);
      expect(find.byType(ProviderAgendaView), findsOneWidget);
      expect(find.text('Open Availability Slot'), findsWidgets);

      // Tap toggle button again to return to Card List view
      await tester.tap(toggleBtn);
      await tester.pumpAndSettle();

      expect(find.textContaining('Requests (0)'), findsOneWidget);
      expect(find.byType(ProviderAgendaView), findsNothing);
    });
  });
}
