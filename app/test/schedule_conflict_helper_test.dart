import 'package:flutter_test/flutter_test.dart';
import 'package:app/core/utils/schedule_conflict_helper.dart';
import 'package:app/data/models/booking_model.dart';

void main() {
  final now = DateTime(2026, 10, 5, 10, 0); // 10:00 AM

  BookingModel createBooking({
    required String id,
    required DateTime? scheduledAt,
    int durationHours = 1,
    String status = 'Accepted',
    String? serviceLocation,
  }) {
    return BookingModel(
      id: id,
      providerId: 'prov-1',
      customerId: 'cust-1',
      status: status,
      scheduledAt: scheduledAt,
      durationHours: durationHours,
      createdAt: now,
      serviceLocation: serviceLocation,
    );
  }

  group('ScheduleConflictHelper', () {
    test('returns clear when there are no existing bookings', () {
      final target = createBooking(
        id: 'target',
        scheduledAt: now,
      );

      final analysis = ScheduleConflictHelper.analyze(
        targetBooking: target,
        existingBookings: [],
      );

      expect(analysis.severity, ConflictSeverity.clear);
      expect(analysis.isClear, isTrue);
      expect(analysis.message, contains('Slot clear'));
    });

    test('returns conflict when target directly overlaps existing booking', () {
      final target = createBooking(
        id: 'target',
        scheduledAt: DateTime(2026, 10, 5, 10, 30), // 10:30 AM to 11:30 AM
        durationHours: 1,
      );

      final existing = createBooking(
        id: 'exist-1',
        scheduledAt: DateTime(2026, 10, 5, 10, 0), // 10:00 AM to 11:00 AM
        durationHours: 1,
        serviceLocation: 'Colombo 07',
      );

      final analysis = ScheduleConflictHelper.analyze(
        targetBooking: target,
        existingBookings: [existing],
      );

      expect(analysis.severity, ConflictSeverity.conflict);
      expect(analysis.hasConflict, isTrue);
      expect(analysis.message, contains('Overlaps with 10:00 AM booking in Colombo 07'));
      expect(analysis.conflictingBooking?.id, 'exist-1');
    });

    test('returns tight when target is within 60 minutes of another booking', () {
      final target = createBooking(
        id: 'target',
        scheduledAt: DateTime(2026, 10, 5, 11, 45), // 11:45 AM
        durationHours: 1,
      );

      final existing = createBooking(
        id: 'exist-2',
        scheduledAt: DateTime(2026, 10, 5, 10, 0), // 10:00 AM to 11:00 AM (45 min gap)
        durationHours: 1,
        serviceLocation: 'Kollupitiya',
      );

      final analysis = ScheduleConflictHelper.analyze(
        targetBooking: target,
        existingBookings: [existing],
        tightTurnaroundMinutes: 90,
      );

      expect(analysis.severity, ConflictSeverity.tight);
      expect(analysis.isTight, isTrue);
      expect(analysis.message, contains('Tight schedule: 45 min gap with 10:00 AM booking'));
    });

    test('ignores non-confirmed bookings (e.g. Expired, Declined, Requested)', () {
      final target = createBooking(
        id: 'target',
        scheduledAt: DateTime(2026, 10, 5, 10, 0),
        durationHours: 1,
      );

      final expired = createBooking(
        id: 'exist-expired',
        scheduledAt: DateTime(2026, 10, 5, 10, 0),
        status: 'Expired',
      );

      final declined = createBooking(
        id: 'exist-declined',
        scheduledAt: DateTime(2026, 10, 5, 10, 0),
        status: 'Declined',
      );

      final analysis = ScheduleConflictHelper.analyze(
        targetBooking: target,
        existingBookings: [expired, declined],
      );

      expect(analysis.severity, ConflictSeverity.clear);
      expect(analysis.isClear, isTrue);
    });

    test('prioritizes direct conflict over tight turnaround regardless of list order', () {
      final target = createBooking(
        id: 'target',
        scheduledAt: DateTime(2026, 10, 5, 10, 0), // 10:00 - 11:00
        durationHours: 1,
      );

      final tightBooking = createBooking(
        id: 'tight-first',
        scheduledAt: DateTime(2026, 10, 5, 11, 30), // 11:30 - 12:30 (30 min gap)
        durationHours: 1,
      );

      final overlappingBooking = createBooking(
        id: 'overlap-second',
        scheduledAt: DateTime(2026, 10, 5, 10, 30), // 10:30 - 11:30 (direct overlap!)
        durationHours: 1,
      );

      // Tight booking comes FIRST in the list
      final analysis = ScheduleConflictHelper.analyze(
        targetBooking: target,
        existingBookings: [tightBooking, overlappingBooking],
      );

      expect(analysis.severity, ConflictSeverity.conflict);
      expect(analysis.hasConflict, isTrue);
      expect(analysis.conflictingBooking?.id, equals('overlap-second'));
    });
  });
}
