import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/models/service_listing_model.dart';
import 'package:app/data/repositories/booking_repository.dart';
import 'package:app/providers/booking_provider.dart';
import 'package:app/screens/customer/service_listing_details_screen.dart';
import 'package:app/screens/customer/location_picker_screen.dart';

class FakeBookingRepository implements BookingRepository {
  @override
  late ApiClient apiClient;

  Map<String, dynamic>? lastPayload;

  @override
  Future<BookingModel> createBookingFromListing({
    required String serviceListingId,
    required DateTime scheduledAt,
    String? serviceLocation,
    double? latitude,
    double? longitude,
    String? notes,
  }) async {
    lastPayload = {
      'serviceListingId': serviceListingId,
      'scheduledAt': scheduledAt,
      'serviceLocation': serviceLocation,
      'latitude': latitude,
      'longitude': longitude,
      'notes': notes,
    };

    return BookingModel(
      id: 'booking-loc-123',
      providerId: 'provider-1',
      customerId: 'customer-1',
      status: 'Requested',
      createdAt: DateTime.now(),
      serviceLocation: serviceLocation,
      notes: notes,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  final sampleListing = ServiceListingModel(
    id: 'listing-loc-999',
    providerId: 'provider-1',
    serviceCategoryId: 'cat-1',
    title: 'Ceiling Fan Installation',
    description: 'Expert ceiling fan and regulator setup.',
    fixedPrice: 4500,
    durationHours: 1,
    estimatedDuration: '1 Hour',
    scope: 'Includes mounting and wiring.',
    availability: 'Mon - Fri',
    isActive: true,
  );

  testWidgets('ServiceListingDetailsScreen displays Service Location card with Set on Map button', (tester) async {
    final mockRepo = FakeBookingRepository();
    final bookingProvider = BookingProvider(repository: mockRepo);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<BookingProvider>.value(value: bookingProvider),
        ],
        child: MaterialApp(
          home: ServiceListingDetailsScreen(listing: sampleListing),
        ),
      ),
    );

    // Open booking modal
    await tester.tap(find.text('Book Service'));
    await tester.pumpAndSettle();

    // Verify Service Location section exists
    expect(find.text('Service Location'), findsOneWidget);
    expect(find.text('Set on Map'), findsOneWidget);
    expect(find.byIcon(Icons.location_on), findsWidgets);
  });

  testWidgets('LocationPickerScreen renders map UI, landmark field, and confirm button without district dropdown', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: LocationPickerScreen(
          initialAddress: '42 Flower Road',
          initialLatitude: 6.9056,
          initialLongitude: 79.8622,
        ),
      ),
    );

    // Verify key UI elements in LocationPickerScreen
    expect(find.text('Set Service Location'), findsOneWidget);
    expect(find.text('Confirm Location'), findsOneWidget);
    // Verify district dropdown is NOT present (no longer messes with directions)
    expect(find.byType(DropdownButtonFormField<String>), findsNothing);
    expect(find.byIcon(Icons.my_location), findsOneWidget);
  });

  testWidgets('LocationPickerScreen keeps landmark field empty when initialAddress is passed', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: LocationPickerScreen(
          initialAddress: '42 Flower Road, Colombo 03',
          initialLatitude: 6.9056,
          initialLongitude: 79.8622,
        ),
      ),
    );

    // Verify landmark input field starts empty and does not duplicate initial address
    final textField = tester.widget<TextField>(find.byType(TextField));
    expect(textField.controller?.text, isEmpty);
    // Detected address card displays the initial address
    expect(find.text('42 Flower Road, Colombo 03'), findsOneWidget);
  });
}
