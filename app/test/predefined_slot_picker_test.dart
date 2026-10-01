import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/data/models/predefined_slot_model.dart';
import 'package:app/data/repositories/provider_availability_repository.dart';
import 'package:app/widgets/predefined_slot_picker.dart';

class MockAvailabilityRepository extends ProviderAvailabilityRepository {
  DailySlotsModel? dailySlotsResponse;
  DateTime? lastRequestedDate;
  int? lastRequestedDuration;

  MockAvailabilityRepository({this.dailySlotsResponse});

  @override
  Future<DailySlotsModel> getPredefinedSlots({
    required String providerId,
    required DateTime date,
    int durationHours = 1,
  }) async {
    lastRequestedDate = date;
    lastRequestedDuration = durationHours;
    return dailySlotsResponse ??
        DailySlotsModel(
          providerId: providerId,
          date: date,
          durationHours: durationHours,
          isWorkingDay: true,
          slots: [
            PredefinedSlotModel(
              slotKey: '09:00',
              displayLabel: '09:00 AM - 10:00 AM',
              startTime: DateTime.utc(date.year, date.month, date.day, 9, 0),
              endTime: DateTime.utc(date.year, date.month, date.day, 10, 0),
              isAvailable: true,
            ),
            PredefinedSlotModel(
              slotKey: '10:00',
              displayLabel: '10:00 AM - 11:00 AM',
              startTime: DateTime.utc(date.year, date.month, date.day, 10, 0),
              endTime: DateTime.utc(date.year, date.month, date.day, 11, 0),
              isAvailable: false,
              unavailableReason: 'Booked',
            ),
          ],
        );
  }
}

void main() {
  group('PredefinedSlotModel & DailySlotsModel', () {
    test('serializes and deserializes correctly', () {
      final json = {
        'providerId': 'prov-123',
        'date': '2026-10-15',
        'durationHours': 2,
        'isWorkingDay': true,
        'slots': [
          {
            'slotKey': '09:00',
            'displayLabel': '09:00 AM - 11:00 AM',
            'startTime': '2026-10-15T09:00:00.000Z',
            'endTime': '2026-10-15T11:00:00.000Z',
            'isAvailable': true,
            'unavailableReason': null,
          },
          {
            'slotKey': '11:00',
            'displayLabel': '11:00 AM - 01:00 PM',
            'startTime': '2026-10-15T11:00:00.000Z',
            'endTime': '2026-10-15T13:00:00.000Z',
            'isAvailable': false,
            'unavailableReason': 'Booked',
          },
        ],
      };

      final daily = DailySlotsModel.fromJson(json);
      expect(daily.providerId, 'prov-123');
      expect(daily.durationHours, 2);
      expect(daily.isWorkingDay, true);
      expect(daily.slots.length, 2);

      final slot1 = daily.slots.first;
      expect(slot1.slotKey, '09:00');
      expect(slot1.isAvailable, true);
      expect(slot1.unavailableReason, isNull);

      final slot2 = daily.slots[1];
      expect(slot2.isAvailable, false);
      expect(slot2.unavailableReason, 'Booked');

      final serialized = daily.toJson();
      expect(serialized['providerId'], 'prov-123');
      expect(serialized['durationHours'], 2);
    });
  });

  group('PredefinedSlotPicker Widget', () {
    testWidgets('renders 14-day date strip and slot chips', (tester) async {
      final mockRepo = MockAvailabilityRepository();
      PredefinedSlotModel? selectedSlot;

      final testDate = DateTime(2026, 10, 15);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PredefinedSlotPicker(
              providerId: 'prov-123',
              durationHours: 1,
              initialDate: testDate,
              repository: mockRepo,
              onSlotSelected: (slot) {
                selectedSlot = slot;
              },
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Date strip is present
      expect(find.text('Select Date'), findsOneWidget);
      expect(find.text('Time Slots (1 Hour)'), findsOneWidget);
      // Daypart segmentation tabs are present
      expect(find.text('Morning'), findsOneWidget);

      // Available and unavailable slot chips are displayed
      expect(find.text('09:00 AM'), findsOneWidget);
      expect(find.text('10:00 AM'), findsOneWidget);
      expect(find.text('Booked'), findsOneWidget);

      // Tap on the available slot
      await tester.tap(find.text('09:00 AM'));
      await tester.pumpAndSettle();

      expect(selectedSlot, isNotNull);
      expect(selectedSlot!.slotKey, '09:00');
    });

    testWidgets('renders closed notice when day is not working day', (tester) async {
      final mockRepo = MockAvailabilityRepository(
        dailySlotsResponse: DailySlotsModel(
          providerId: 'prov-123',
          date: DateTime(2026, 10, 18),
          durationHours: 1,
          isWorkingDay: false,
          slots: [],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PredefinedSlotPicker(
              providerId: 'prov-123',
              durationHours: 1,
              initialDate: DateTime(2026, 10, 18),
              repository: mockRepo,
              onSlotSelected: (_) {},
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(
        find.text('Provider is closed on this day. Please select another date.'),
        findsOneWidget,
      );
    });

    testWidgets('shows multi-hour banner when durationHours > 1 and slot selected', (tester) async {
      final mockRepo = MockAvailabilityRepository(
        dailySlotsResponse: DailySlotsModel(
          providerId: 'prov-123',
          date: DateTime(2026, 10, 15),
          durationHours: 2,
          isWorkingDay: true,
          slots: [
            PredefinedSlotModel(
              slotKey: '10:00',
              displayLabel: '10:00 AM - 12:00 PM',
              startTime: DateTime.utc(2026, 10, 15, 10, 0),
              endTime: DateTime.utc(2026, 10, 15, 12, 0),
              isAvailable: true,
            ),
          ],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PredefinedSlotPicker(
              providerId: 'prov-123',
              durationHours: 2,
              initialDate: DateTime(2026, 10, 15),
              repository: mockRepo,
              onSlotSelected: (_) {},
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap slot to select
      await tester.tap(find.text('10:00 AM'));
      await tester.pumpAndSettle();

      // Multi-hour banner appears
      expect(find.textContaining('Consecutive Slots Reserved'), findsOneWidget);
    });

    testWidgets('resolves ProviderAvailabilityRepository from context without error', (tester) async {
      final mockRepo = MockAvailabilityRepository();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            Provider<ProviderAvailabilityRepository>.value(value: mockRepo),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: PredefinedSlotPicker(
                providerId: 'prov-123',
                initialDate: DateTime(2026, 10, 15),
                onSlotSelected: (_) {},
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Select Date'), findsOneWidget);
      expect(find.text('Unable to connect to availability service.'), findsNothing);
      expect(find.text('09:00 AM'), findsOneWidget);
    });
  });
}
