import 'package:flutter_test/flutter_test.dart';
import 'package:app/data/models/job_request_model.dart';

/// These fixtures mirror `JobRequestResponseDto` exactly, in the casing the
/// backend actually emits (ASP.NET Core default camelCase — Program.cs adds a
/// JsonStringEnumConverter but never sets a PropertyNamingPolicy).
///
/// The bug these guard against: the model previously read json['category'],
/// which the backend never sends, so every request silently displayed a
/// hardcoded fallback instead of its real category.
Map<String, dynamic> realResponseJson() => {
      'id': '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      'serviceCategoryId': '8a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9',
      'categoryName': 'Plumbing',
      'description': 'Leaking pipe under the kitchen sink',
      'photoUrls': <String>[],
      'location': 'Colombo 03',
      'urgency': 'High',
      'budgetMin': 3000,
      'budgetMax': 8000,
      'status': 'PendingAiReview',
      'customerId': '11111111-2222-3333-4444-555555555555',
      'createdAt': '2026-09-23T10:15:30+05:30',
      'updatedAt': null,
    };

void main() {
  group('JobRequestModel.fromJson against the real DTO shape', () {
    test('maps serviceCategoryId and categoryName from the real fields', () {
      final model = JobRequestModel.fromJson(realResponseJson());

      expect(model.serviceCategoryId, '8a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9');
      expect(model.categoryName, 'Plumbing');
    });

    test('maps every remaining scalar field', () {
      final model = JobRequestModel.fromJson(realResponseJson());

      expect(model.id, '3f2504e0-4f89-11d3-9a0c-0305e82c3301');
      expect(model.description, 'Leaking pipe under the kitchen sink');
      expect(model.location, 'Colombo 03');
      expect(model.urgency, 'High');
      expect(model.budgetMin, 3000);
      expect(model.budgetMax, 8000);
      expect(model.status, 'PendingAiReview');
      expect(model.customerId, '11111111-2222-3333-4444-555555555555');
      expect(model.photoUrls, isEmpty);
      expect(model.updatedAt, isNull);
      expect(model.createdAt.year, 2026);
    });

    test('does not fall back to a placeholder category when the real field is present', () {
      final model = JobRequestModel.fromJson(realResponseJson());
      expect(model.categoryName, isNot('General'));
    });

    test('parses photoUrls when the backend returns some', () {
      final json = realResponseJson()
        ..['photoUrls'] = ['https://cdn.handee.lk/a.jpg', 'https://cdn.handee.lk/b.jpg'];

      final model = JobRequestModel.fromJson(json);
      expect(model.photoUrls, hasLength(2));
      expect(model.photoUrls.first, 'https://cdn.handee.lk/a.jpg');
    });

    test('parses updatedAt when present', () {
      final json = realResponseJson()..['updatedAt'] = '2026-09-24T09:00:00+05:30';
      final model = JobRequestModel.fromJson(json);
      expect(model.updatedAt, isNotNull);
      expect(model.updatedAt!.day, 24);
    });
  });

  group('JobRequestStatus handling (real enum: PendingAiReview | Open | Cancelled)', () {
    JobRequestModel withStatus(String status) =>
        JobRequestModel.fromJson(realResponseJson()..['status'] = status);

    test('recognises PendingAiReview', () {
      final model = withStatus('PendingAiReview');
      expect(model.isPendingAiReview, isTrue);
      expect(model.isOpen, isFalse);
      expect(model.isCancelled, isFalse);
      expect(model.displayStatus, 'Pending AI Review');
    });

    test('recognises Open', () {
      final model = withStatus('Open');
      expect(model.isOpen, isTrue);
      expect(model.isPendingAiReview, isFalse);
      expect(model.displayStatus, 'Open');
    });

    test('recognises Cancelled', () {
      final model = withStatus('Cancelled');
      expect(model.isCancelled, isTrue);
      expect(model.isOpen, isFalse);
      expect(model.displayStatus, 'Cancelled');
    });

    test('exactly one status flag is true for each real enum value', () {
      for (final status in ['PendingAiReview', 'Open', 'Cancelled']) {
        final m = withStatus(status);
        final flags = [m.isPendingAiReview, m.isOpen, m.isCancelled];
        expect(flags.where((f) => f).length, 1, reason: 'for status "$status"');
      }
    });
  });

  group('JobRequestModel.toJson', () {
    test('emits the field names the backend uses, and none it does not', () {
      final json = JobRequestModel.fromJson(realResponseJson()).toJson();

      expect(json.containsKey('serviceCategoryId'), isTrue);
      expect(json.containsKey('categoryName'), isTrue);

      // Removed: these never existed on JobRequestResponseDto.
      expect(json.containsKey('category'), isFalse);
      expect(json.containsKey('estimatedPrice'), isFalse);
      expect(json.containsKey('assignedProvider'), isFalse);
      expect(json.containsKey('customerName'), isFalse);
    });

    test('round-trips through fromJson without losing values', () {
      final original = JobRequestModel.fromJson(realResponseJson());
      final roundTripped = JobRequestModel.fromJson(original.toJson());

      expect(roundTripped.id, original.id);
      expect(roundTripped.serviceCategoryId, original.serviceCategoryId);
      expect(roundTripped.categoryName, original.categoryName);
      expect(roundTripped.status, original.status);
      expect(roundTripped.urgency, original.urgency);
      expect(roundTripped.budgetMin, original.budgetMin);
      expect(roundTripped.budgetMax, original.budgetMax);
    });
  });

  group('JobRequestModel.cleanLocation', () {
    test('strips trailing bracketed coordinates from location string', () {
      final model = JobRequestModel.fromJson(
        realResponseJson()..['location'] = 'Colombo 03, Western Province (Keells) [6.9271,79.8612]',
      );

      expect(model.location, 'Colombo 03, Western Province (Keells) [6.9271,79.8612]');
      expect(model.cleanLocation, 'Colombo 03, Western Province (Keells)');
    });

    test('returns original string when no bracketed coordinates are attached', () {
      final model = JobRequestModel.fromJson(
        realResponseJson()..['location'] = 'Kandy City Center, Kandy',
      );

      expect(model.cleanLocation, 'Kandy City Center, Kandy');
    });
  });
}
