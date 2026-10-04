import 'package:intl/intl.dart';
import '../../data/models/booking_model.dart';

enum ConflictSeverity {
  clear,
  tight,
  conflict,
}

class ConflictAnalysis {
  final ConflictSeverity severity;
  final String message;
  final BookingModel? conflictingBooking;

  const ConflictAnalysis({
    required this.severity,
    required this.message,
    this.conflictingBooking,
  });

  bool get isClear => severity == ConflictSeverity.clear;
  bool get isTight => severity == ConflictSeverity.tight;
  bool get hasConflict => severity == ConflictSeverity.conflict;
}

class ScheduleConflictHelper {
  static String _formatBookingLabel(BookingModel b) {
    final timeStr = b.scheduledAt != null ? DateFormat('h:mm a').format(b.scheduledAt!) : '';
    final loc = b.serviceLocation?.isNotEmpty == true ? ' in ${b.serviceLocation}' : '';
    return '$timeStr booking$loc';
  }

  /// Analyzes a target [BookingModel] against the provider's [existingBookings]
  /// to identify direct time overlaps or tight turnaround schedules.
  static ConflictAnalysis analyze({
    required BookingModel targetBooking,
    required List<BookingModel> existingBookings,
    int tightTurnaroundMinutes = 90,
  }) {
    if (targetBooking.scheduledAt == null) {
      return const ConflictAnalysis(
        severity: ConflictSeverity.clear,
        message: 'No scheduled appointment time set',
      );
    }

    final targetStart = targetBooking.scheduledAt!;
    final targetEnd = targetBooking.calculatedEndTime ?? targetStart.add(const Duration(hours: 1));

    // Filter confirmed/active bookings with a valid scheduledAt
    final validExisting = existingBookings.where((b) {
      if (b.id == targetBooking.id) return false;
      if (b.scheduledAt == null) return false;
      final status = b.status.toLowerCase();
      // Only check active and accepted commitments
      return status == 'accepted' || status == 'inprogress';
    }).toList();

    // Pass 1: Prioritize hard collisions / overlaps first
    for (final existing in validExisting) {
      if (targetBooking.overlapsWith(existing)) {
        final label = _formatBookingLabel(existing);
        return ConflictAnalysis(
          severity: ConflictSeverity.conflict,
          message: 'Overlaps with $label',
          conflictingBooking: existing,
        );
      }
    }

    // Pass 2: Evaluate tight turnaround buffers
    BookingModel? tightestBooking;
    int? minGapMinutes;

    for (final existing in validExisting) {
      final existingStart = existing.scheduledAt!;
      final existingEnd = existing.calculatedEndTime ?? existingStart.add(const Duration(hours: 1));

      int? gap;
      if (targetStart.isAfter(existingEnd)) {
        gap = targetStart.difference(existingEnd).inMinutes;
      } else if (existingStart.isAfter(targetEnd)) {
        gap = existingStart.difference(targetEnd).inMinutes;
      }

      if (gap != null && gap <= tightTurnaroundMinutes) {
        if (minGapMinutes == null || gap < minGapMinutes) {
          minGapMinutes = gap;
          tightestBooking = existing;
        }
      }
    }

    if (minGapMinutes != null && tightestBooking != null) {
      final label = _formatBookingLabel(tightestBooking);
      return ConflictAnalysis(
        severity: ConflictSeverity.tight,
        message: 'Tight schedule: $minGapMinutes min gap with $label',
        conflictingBooking: tightestBooking,
      );
    }

    return const ConflictAnalysis(
      severity: ConflictSeverity.clear,
      message: 'Slot clear: No conflicting appointments',
    );
  }
}
