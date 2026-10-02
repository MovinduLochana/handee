import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/data/repositories/dispatch_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/providers/dispatch_provider.dart';
import 'package:app/screens/provider/dispatch_queue_screen.dart';
import 'package:app/screens/provider/provider_jobs_screen.dart';
import 'package:app/screens/provider/widgets/provider_agenda_view.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'prov-001',
      'user_name': 'Provider Bob',
    });
    storage = await StorageService.getInstance();
  });

  testWidgets('ProviderJobsScreen renders segmented switcher and switches between Scheduled and Instant modes', (tester) async {
    final scheduledRequest = {
      'id': 'book-sched-req',
      'customerId': 'cust-1',
      'customerName': 'Saman Perera',
      'providerId': 'prov-001',
      'category': 'Carpentry',
      'scheduledAt': DateTime.now().add(const Duration(days: 1)).toIso8601String(),
      'price': 4500.0,
      'status': 'Requested',
      'bookingType': 'Scheduled',
      'createdAt': DateTime.now().toIso8601String(),
    };

    final scheduledConfirmed = {
      'id': 'book-sched-conf',
      'customerId': 'cust-2',
      'customerName': 'Sunil Silva',
      'providerId': 'prov-001',
      'category': 'Furniture Assembly',
      'scheduledAt': DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day, 10, 0).toIso8601String(),
      'durationHours': 2,
      'price': 5000.0,
      'status': 'Accepted',
      'bookingType': 'Scheduled',
      'createdAt': DateTime.now().toIso8601String(),
    };

    final instantActive = {
      'id': 'book-inst-act',
      'customerId': 'cust-3',
      'customerName': 'Kamal Fernando',
      'customerPhone': '+94 77 123 4567',
      'serviceLocation': 'Colombo 03',
      'category': 'Emergency Pipe Leak',
      'price': 3500.0,
      'status': 'InProgress',
      'bookingType': 'InstantMatch',
      'createdAt': DateTime.now().toIso8601String(),
    };

    final mockClient = MockClient((request) async {
      if (request.url.path == '/api/provider/booking-requests') {
        return http.Response(jsonEncode([scheduledRequest]), 200);
      }
      if (request.url.path == '/bookings/provider-mine') {
        return http.Response(jsonEncode([scheduledConfirmed, instantActive]), 200);
      }
      if (request.url.path == '/api/provider/instant-offers') {
        return http.Response(jsonEncode([]), 200);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
    final repo = BookingRepository(apiClient: apiClient);
    final dispatchRepo = DispatchRepository(apiClient: apiClient, storage: storage);
    final bookingProvider = BookingProvider(repository: repo);
    final dispatchProvider = DispatchProvider(repository: dispatchRepo);

    await bookingProvider.fetchProviderBookings();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
          ChangeNotifierProvider<DispatchProvider>.value(value: dispatchProvider),
        ],
        child: const MaterialApp(
          home: ProviderJobsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Verify Default Segment is Scheduled with 2 total items (1 request + 1 upcoming)
    expect(find.byKey(const Key('provider_job_segment_selector')), findsOneWidget);
    expect(find.textContaining('Scheduled (2)'), findsOneWidget);
    expect(find.textContaining('Instant (1)'), findsOneWidget);

    // 2. Scheduled sub-tabs are displayed
    expect(find.byKey(const Key('scheduled_tab_bar')), findsOneWidget);
    expect(find.textContaining('Requests (1)'), findsOneWidget);
    expect(find.textContaining('Upcoming (1)'), findsOneWidget);
    expect(find.textContaining('History (0)'), findsOneWidget);

    // 3. Agenda toggle icon is visible in Scheduled mode
    expect(find.byKey(const Key('toggle_agenda_view_button')), findsOneWidget);

    // 4. Switch to Instant Mode via SegmentedButton
    await tester.tap(find.textContaining('Instant (1)'));
    await tester.pumpAndSettle();

    // 5. In Instant Mode: scheduled tabs and agenda button are hidden
    expect(find.byKey(const Key('scheduled_tab_bar')), findsNothing);
    expect(find.byKey(const Key('toggle_agenda_view_button')), findsNothing);

    // 6. Instant sub-tabs are visible
    expect(find.byKey(const Key('instant_tab_bar')), findsOneWidget);
    expect(find.textContaining('Active (1)'), findsOneWidget);
    expect(find.textContaining('History (0)'), findsOneWidget);

    // 7. Live Radar Banner is rendered
    expect(find.byKey(const Key('instant_dispatch_radar_banner')), findsOneWidget);
    expect(find.text('Live Radar Online'), findsOneWidget);

    // 8. Instant active card is displayed with INSTANT DISPATCH badge
    expect(find.text('Kamal Fernando'), findsOneWidget);
    expect(find.textContaining('INSTANT DISPATCH'), findsOneWidget);
    expect(find.text('Emergency Pipe Leak'), findsOneWidget);

    // 9. Tapping 'Open Radar' navigates to DispatchQueueScreen
    final openRadarBtn = find.byKey(const Key('open_live_radar_button'));
    expect(openRadarBtn, findsOneWidget);
    await tester.tap(openRadarBtn);
    await tester.pumpAndSettle();

    expect(find.byType(DispatchQueueScreen), findsOneWidget);
    expect(find.text('Live Dispatch Queue'), findsOneWidget);

    // Pop back from DispatchQueueScreen
    await tester.pageBack();
    await tester.pumpAndSettle();

    // 10. Switch back to Scheduled Mode
    await tester.tap(find.textContaining('Scheduled (2)'));
    await tester.pumpAndSettle();

    // Toggle to Agenda View
    await tester.tap(find.byKey(const Key('toggle_agenda_view_button')));
    await tester.pumpAndSettle();

    // ProviderAgendaView is rendered with upcoming scheduled bookings
    expect(find.byType(ProviderAgendaView), findsOneWidget);
    expect(find.text('Furniture Assembly'), findsOneWidget);
  });
}
