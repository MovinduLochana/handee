import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/models/booking_model.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:provider/provider.dart';
import 'package:app/screens/customer/edit_customer_profile_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'dummy-token',
      'user_id': 'user-123',
      'user_email': 'kasun@handee.lk',
      'user_name': 'Kasun Perera',
      'user_role': 'Customer',
    });
    storage = await StorageService.getInstance();
  });

  test('BookingModel correctly parses flat fields and providerName from BookingResponseDto', () {
    final json = {
      'id': 'b-001',
      'jobRequestId': 'jr-001',
      'providerId': 'p-001',
      'customerId': 'c-001',
      'status': 'InProgress',
      'scheduledAt': '2026-09-27T10:00:00Z',
      'createdAt': '2026-09-27T08:00:00Z',
      'customerName': 'Kasun Perera',
      'customerPhone': '+94771234567',
      'providerName': 'Nimal Jayawardena',
      'serviceLocation': 'Colombo 03',
      'price': 4500.0,
      'category': 'Emergency Plumbing',
      'description': 'Main kitchen pipe burst repair',
      'notes': 'Please enter through the side gate',
    };

    final booking = BookingModel.fromJson(json);
    expect(booking.id, 'b-001');
    expect(booking.providerName, 'Nimal Jayawardena');
    expect(booking.customerName, 'Kasun Perera');
    expect(booking.category, 'Emergency Plumbing');
    expect(booking.description, 'Main kitchen pipe burst repair');
    expect(booking.notes, 'Please enter through the side gate');
    expect(booking.isInProgress, isTrue);
    expect(booking.displayStatus, 'In Progress');
  });

  test('AuthRepository and AuthProvider updateProfile stores and updates user details', () async {
    final client = ApiClient(
      storage: storage,
      httpClient: MockClient((req) async {
        if (req.method == 'PUT' && req.url.path == '/users/me') {
          return http.Response('', 204);
        }
        if (req.method == 'GET' && req.url.path == '/users/me') {
          return http.Response(jsonEncode({
            'id': 'user-123',
            'email': 'kasun@handee.lk',
            'fullName': 'Kasun Updated',
            'role': 'Customer',
            'phoneNumber': '+94779876543',
            'address': 'No. 12, Flower Road, Colombo 07',
          }), 200);
        }
        return http.Response('{}', 200);
      }),
      baseUrl: 'http://localhost',
    );

    final authRepo = AuthRepository(apiClient: client, storage: storage);
    final authProvider = AuthProvider(authRepo: authRepo, storage: storage);

    final success = await authProvider.updateProfile(
      fullName: 'Kasun Updated',
      phoneNumber: '+94779876543',
      address: 'No. 12, Flower Road, Colombo 07',
    );

    expect(success, isTrue);
    expect(authProvider.currentUser?.fullName, 'Kasun Updated');
    expect(authProvider.currentUser?.phoneNumber, '+94779876543');
    expect(authProvider.currentUser?.address, 'No. 12, Flower Road, Colombo 07');
    expect(storage.getUserName(), 'Kasun Updated');
  });

  test('ProviderRepository getMyProfile and updateMyProfile work with backend shape', () async {
    final client = ApiClient(
      storage: storage,
      httpClient: MockClient((req) async {
        if (req.method == 'GET' && req.url.path == '/api/providers/me') {
          return http.Response(jsonEncode({
            'id': 'p-profile-01',
            'userId': 'user-123',
            'fullName': 'Nimal Jayawardena',
            'headline': 'Master Electrician',
            'yearsOfExperience': 12,
            'isAvailableForWork': true,
            'serviceAreaDisplayName': 'Colombo Metro',
            'serviceCategories': [
              {'id': 'cat-1', 'name': 'Electrical'}
            ],
            'languages': ['English', 'Sinhala'],
            'verificationStatus': 'Verified',
          }), 200);
        }
        if (req.method == 'PUT' && req.url.path.contains('/api/providers/')) {
          return http.Response('', 204);
        }
        return http.Response('[]', 200);
      }),
      baseUrl: 'http://localhost',
    );

    final providerRepo = ProviderRepository(apiClient: client);
    final profile = await providerRepo.getMyProfile();
    expect(profile.fullName, 'Nimal Jayawardena');
    expect(profile.headline, 'Master Electrician');
    expect(profile.yearsOfExperience, 12);
    expect(profile.skillCategories, contains('Electrical'));

    final updated = await providerRepo.updateMyProfile(
      profileId: profile.id,
      headline: 'Certified Master Electrician & Solar Installer',
      yearsOfExperience: 14,
    );
    expect(updated.headline, isNotEmpty);
  });

  testWidgets('EditCustomerProfileScreen renders and saves changes', (tester) async {
    final client = ApiClient(
      storage: storage,
      httpClient: MockClient((req) async => http.Response('{}', 200)),
      baseUrl: 'http://localhost',
    );
    final authRepo = AuthRepository(apiClient: client, storage: storage);
    final authProvider = AuthProvider(authRepo: authRepo, storage: storage);

    await tester.pumpWidget(
      ChangeNotifierProvider<AuthProvider>.value(
        value: authProvider,
        child: const MaterialApp(
          home: EditCustomerProfileScreen(),
        ),
      ),
    );

    expect(find.text('Edit Customer Profile'), findsOneWidget);
    expect(find.text('Save Changes'), findsOneWidget);

    // Enter full name and phone number
    await tester.enterText(find.byType(TextFormField).at(0), 'Nimali Fernando');
    await tester.enterText(find.byType(TextFormField).at(1), '+94 71 234 5678');
    await tester.enterText(find.byType(TextFormField).at(2), 'Kandy, Central Province');

    await tester.tap(find.text('Save Changes'));
    await tester.pumpAndSettle();

    expect(authProvider.currentUser?.fullName, 'Nimali Fernando');
  });
}
