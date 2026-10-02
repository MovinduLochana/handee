import 'package:flutter_test/flutter_test.dart';
import 'package:app/data/models/booking_model.dart';

void main() {
  group('BookingModel Schedule & Overlap Seam (TDD)', () {
    test('calculatedEndTime returns scheduledAt plus durationHours', () {
      final start = DateTime(2026, 10, 15, 10, 0);
      final booking = BookingModel(
        id: 'b1',
        providerId: 'p1',
        customerId: 'c1',
        status: 'Accepted',
        createdAt: DateTime.now(),
        scheduledAt: start,
        durationHours: 2,
      );

      expect(booking.calculatedEndTime, equals(DateTime(2026, 10, 15, 12, 0)));
    });

    test('calculatedEndTime defaults to 1 hour if durationHours is zero or negative', () {
      final start = DateTime(2026, 10, 15, 14, 0);
      final booking = BookingModel(
        id: 'b2',
        providerId: 'p1',
        customerId: 'c1',
        status: 'Requested',
        createdAt: DateTime.now(),
        scheduledAt: start,
        durationHours: 0,
      );

      expect(booking.calculatedEndTime, equals(DateTime(2026, 10, 15, 15, 0)));
    });

    test('calculatedEndTime returns null when scheduledAt is null', () {
      final booking = BookingModel(
        id: 'b3',
        providerId: 'p1',
        customerId: 'c1',
        status: 'Requested',
        createdAt: DateTime.now(),
        scheduledAt: null,
      );

      expect(booking.calculatedEndTime, isNull);
    });

    test('overlapsWith detects overlapping time windows', () {
      final b1 = BookingModel(
        id: 'b1',
        providerId: 'p1',
        customerId: 'c1',
        status: 'Accepted',
        createdAt: DateTime.now(),
        scheduledAt: DateTime(2026, 10, 15, 10, 0),
        durationHours: 2, // 10:00 - 12:00
      );

      final b2 = BookingModel(
        id: 'b2',
        providerId: 'p1',
        customerId: 'c2',
        status: 'Requested',
        createdAt: DateTime.now(),
        scheduledAt: DateTime(2026, 10, 15, 11, 30),
        durationHours: 1, // 11:30 - 12:30
      );

      final b3 = BookingModel(
        id: 'b3',
        providerId: 'p1',
        customerId: 'c3',
        status: 'Requested',
        createdAt: DateTime.now(),
        scheduledAt: DateTime(2026, 10, 15, 13, 0),
        durationHours: 1, // 13:00 - 14:00 (No overlap)
      );

      expect(b1.overlapsWith(b2), isTrue);
      expect(b2.overlapsWith(b1), isTrue);
      expect(b1.overlapsWith(b3), isFalse);
    });

    test('overlapsWith evaluates buffer threshold between adjacent bookings', () {
      final b1 = BookingModel(
        id: 'b1',
        providerId: 'p1',
        customerId: 'c1',
        status: 'Accepted',
        createdAt: DateTime.now(),
        scheduledAt: DateTime(2026, 10, 15, 10, 0),
        durationHours: 2, // 10:00 - 12:00
      );

      final b2 = BookingModel(
        id: 'b2',
        providerId: 'p1',
        customerId: 'c2',
        status: 'Requested',
        createdAt: DateTime.now(),
        scheduledAt: DateTime(2026, 10, 15, 12, 15), // 15 min gap (< 30 min buffer)
        durationHours: 1,
      );

      final b3 = BookingModel(
        id: 'b3',
        providerId: 'p1',
        customerId: 'c3',
        status: 'Requested',
        createdAt: DateTime.now(),
        scheduledAt: DateTime(2026, 10, 15, 13, 0), // 60 min gap (> 30 min buffer)
        durationHours: 1,
      );

      expect(b1.overlapsWith(b2, buffer: const Duration(minutes: 30)), isTrue);
      expect(b1.overlapsWith(b3, buffer: const Duration(minutes: 30)), isFalse);
    });

    test('overlapsWith returns false if status is declined, expired, or cancelled', () {
      final active = BookingModel(
        id: 'b1',
        providerId: 'p1',
        customerId: 'c1',
        status: 'Accepted',
        createdAt: DateTime.now(),
        scheduledAt: DateTime(2026, 10, 15, 10, 0),
        durationHours: 2,
      );

      final declined = BookingModel(
        id: 'b2',
        providerId: 'p1',
        customerId: 'c2',
        status: 'Declined',
        createdAt: DateTime.now(),
        scheduledAt: DateTime(2026, 10, 15, 10, 30),
        durationHours: 2,
      );

      expect(active.overlapsWith(declined), isFalse);
      expect(declined.overlapsWith(active), isFalse);
    });
  });
}
