import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:app/data/models/provider_availability_slot_model.dart';
import 'package:app/data/repositories/provider_availability_repository.dart';
import 'package:app/widgets/provider_availability_slot_picker.dart';

class MockProviderAvailabilityRepository extends ProviderAvailabilityRepository {
  final List<ProviderAvailabilitySlotModel> mockSlots;

  MockProviderAvailabilityRepository(this.mockSlots);

  @override
  Future<List<ProviderAvailabilitySlotModel>> getForProvider(
    String providerId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    return mockSlots;
  }
}

void main() {
  group('ProviderAvailabilitySlotModel', () {
    test('serializes and deserializes correctly', () {
      final json = {
        'id': 'slot-123',
        'providerId': 'prov-456',
        'startTime': '2026-10-15T09:00:00.000Z',
        'endTime': '2026-10-15T10:00:00.000Z',
        'isBooked': false,
        'createdAt': '2026-10-01T00:00:00.000Z',
        'updatedAt': null,
      };

      final model = ProviderAvailabilitySlotModel.fromJson(json);
      expect(model.id, 'slot-123');
      expect(model.providerId, 'prov-456');
      expect(model.isBooked, false);
      expect(model.startTime.isUtc, true);

      final mappedJson = model.toJson();
      expect(mappedJson['id'], 'slot-123');
      expect(mappedJson['isBooked'], false);
    });
  });

  group('ProviderAvailabilitySlotPicker Widget', () {
    testWidgets('renders flexible scheduling fallback when slots are empty', (tester) async {
      final emptyRepo = MockProviderAvailabilityRepository([]);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProviderAvailabilitySlotPicker(
              providerId: 'prov-456',
              repository: emptyRepo,
              onSlotSelected: (_) {},
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(
        find.text('Flexible scheduling: Select your preferred date and time below.'),
        findsOneWidget,
      );
    });

    testWidgets('renders available slot chips and selects slot on tap', (tester) async {
      final slotTime = DateTime.utc(2026, 10, 15, 9, 0);
      final mockSlots = [
        ProviderAvailabilitySlotModel(
          id: 'slot-1',
          providerId: 'prov-456',
          startTime: slotTime,
          endTime: slotTime.add(const Duration(hours: 1)),
          isBooked: false,
          createdAt: DateTime.utc(2026, 10, 1),
        ),
      ];

      final repo = MockProviderAvailabilityRepository(mockSlots);
      DateTime? selectedResult;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProviderAvailabilitySlotPicker(
              providerId: 'prov-456',
              repository: repo,
              onSlotSelected: (time) {
                selectedResult = time;
              },
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Available Working Slots'), findsOneWidget);
      expect(find.byType(ChoiceChip), findsOneWidget);

      // Find time chip and tap
      final chipFinder = find.byType(InkWell).last;
      await tester.tap(chipFinder);
      await tester.pumpAndSettle();

      expect(selectedResult, isNotNull);
      expect(selectedResult!.hour, slotTime.hour);
    });
  });
}
