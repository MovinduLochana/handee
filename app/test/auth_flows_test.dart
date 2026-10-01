import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/models/user_model.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/screens/auth/customer_register_screen.dart';
import 'package:app/screens/auth/login_screen.dart';
import 'package:app/screens/auth/register_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.getInstance();
  });

  test('AuthRepository register and login sets single dedicated role for user', () async {
    final client = ApiClient(
      storage: storage,
      httpClient: MockClient((req) async {
        if (req.url.path == '/auth/register') {
          return http.Response(jsonEncode({
            'id': 'user-cust-1',
            'email': 'customer@handee.lk',
            'fullName': 'Customer Test',
            'role': 'Customer',
          }), 201);
        }
        if (req.url.path == '/auth/login') {
          return http.Response(jsonEncode({
            'accessToken': 'jwt-access-token-123',
            'refreshToken': 'jwt-refresh-token-123',
          }), 200);
        }
        if (req.url.path == '/users/me') {
          return http.Response(jsonEncode({
            'id': 'user-cust-1',
            'email': 'customer@handee.lk',
            'fullName': 'Customer Test',
            'roles': ['Customer'],
            'phoneNumber': '0771234567',
          }), 200);
        }
        return http.Response('{}', 200);
      }),
      baseUrl: 'http://localhost',
    );

    final authRepo = AuthRepository(apiClient: client, storage: storage);
    final user = await authRepo.register(
      fullName: 'Customer Test',
      email: 'customer@handee.lk',
      password: 'Password123!',
      role: 'Customer',
      phoneNumber: '0771234567',
    );

    expect(user.isCustomer, isTrue);
    expect(user.isProvider, isFalse);
    expect(user.role, 'Customer');
    expect(storage.getAccessToken(), 'jwt-access-token-123');
    expect(storage.getUserRole(), 'Customer');
  });

  test('AuthRepository preserves loggedInUser avatarUrl, verificationStatus and existing phone during address update', () async {
    final client = ApiClient(
      storage: storage,
      httpClient: MockClient((req) async {
        if (req.url.path == '/auth/register') {
          return http.Response(jsonEncode({
            'id': 'user-1',
            'email': 'user@handee.lk',
            'fullName': 'User One',
            'role': 'Customer',
          }), 201);
        }
        if (req.url.path == '/auth/login') {
          return http.Response(jsonEncode({
            'accessToken': 'jwt-access',
            'refreshToken': 'jwt-refresh',
          }), 200);
        }
        if (req.url.path == '/users/me') {
          return http.Response(jsonEncode({
            'id': 'user-1',
            'email': 'user@handee.lk',
            'fullName': 'User One',
            'roles': ['Customer'],
            'phoneNumber': '0779998888',
            'profilePictureUrl': 'https://example.com/avatar.jpg',
            'providerVerificationStatus': 'Verified',
          }), 200);
        }
        return http.Response('{}', 200);
      }),
      baseUrl: 'http://localhost',
    );

    final authRepo = AuthRepository(apiClient: client, storage: storage);
    final user = await authRepo.register(
      fullName: 'User One',
      email: 'user@handee.lk',
      password: 'Password123!',
      role: 'Customer',
      address: 'Kandy, Sri Lanka',
    );

    expect(user.address, 'Kandy, Sri Lanka');
    expect(user.phoneNumber, '0779998888');
    expect(user.avatarUrl, 'https://example.com/avatar.jpg');
    expect(user.providerVerificationStatus, 'Verified');
  });

  test('UserModel parses providerVerificationStatus correctly', () {
    final userJson = {
      'id': 'provider-123',
      'email': 'provider@handee.lk',
      'fullName': 'Pro Master',
      'roles': ['Provider'],
      'providerVerificationStatus': 'Pending',
    };

    final user = UserModel.fromJson(userJson);
    expect(user.isProvider, isTrue);
    expect(user.isCustomer, isFalse);
    expect(user.providerVerificationStatus, 'Pending');
    expect(user.isVerifiedProvider, isFalse);

    final verifiedJson = {
      'id': 'provider-123',
      'email': 'provider@handee.lk',
      'fullName': 'Pro Master',
      'roles': ['Provider'],
      'providerVerificationStatus': 'Verified',
    };
    final verifiedUser = UserModel.fromJson(verifiedJson);
    expect(verifiedUser.isVerifiedProvider, isTrue);
  });

  test('ServiceDirectoryProvider.loadMyProviderProfile retains null _myProfile on failure without fabricating Verified profile', () async {
    final client = ApiClient(
      storage: storage,
      httpClient: MockClient((req) async {
        return http.Response('Internal Server Error', 500);
      }),
      baseUrl: 'http://localhost',
    );

    final providerRepo = ProviderRepository(apiClient: client);
    final listingRepo = ServiceListingRepository(apiClient: client);
    final dirProvider = ServiceDirectoryProvider(
      providerRepo: providerRepo,
      serviceListingRepo: listingRepo,
    );

    expect(dirProvider.myProfile, isNull);
    await dirProvider.loadMyProviderProfile();
    expect(dirProvider.myProfile, isNull);
    expect(dirProvider.errorMessage, isNotNull);
  });

  testWidgets('RegisterScreen presents Customer and Provider choice options', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: RegisterScreen(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Choose Account Type'), findsOneWidget);
    expect(find.text('Customer Account'), findsOneWidget);
    expect(find.text('Immediate Booking'), findsOneWidget);
    expect(find.text('Service Provider / Pro'), findsOneWidget);
    expect(find.text('Specialized Onboarding'), findsOneWidget);
  });

  testWidgets('LoginScreen allows unified sign-in and routes correctly', (tester) async {
    final client = ApiClient(
      storage: storage,
      httpClient: MockClient((req) async {
        if (req.url.path == '/auth/login') {
          return http.Response(jsonEncode({
            'accessToken': 'jwt-access-token',
            'refreshToken': 'jwt-refresh-token',
          }), 200);
        }
        if (req.url.path == '/users/me') {
          return http.Response(jsonEncode({
            'id': 'user-1',
            'email': 'customer@handee.lk',
            'fullName': 'Customer User',
            'roles': ['Customer'],
          }), 200);
        }
        return http.Response('[]', 200);
      }),
      baseUrl: 'http://localhost',
    );

    final authRepo = AuthRepository(apiClient: client, storage: storage);
    final authProvider = AuthProvider(authRepo: authRepo, storage: storage);
    final providerRepo = ProviderRepository(apiClient: client);
    final serviceListingRepo = ServiceListingRepository(apiClient: client);
    final serviceDirectoryProvider = ServiceDirectoryProvider(
      providerRepo: providerRepo,
      serviceListingRepo: serviceListingRepo,
    );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
          ChangeNotifierProvider<ServiceDirectoryProvider>.value(value: serviceDirectoryProvider),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Customer Sign Up'), findsOneWidget);
    expect(find.text('Join as a Pro'), findsOneWidget);
  });

  testWidgets('CustomerRegisterScreen renders form fields and submit button', (tester) async {
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
          home: CustomerRegisterScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Customer Registration'), findsOneWidget);
    expect(find.text('Create Customer Account'), findsOneWidget);
    expect(find.text('Register & Start Booking'), findsOneWidget);
    expect(find.text('Join as a Pro'), findsOneWidget);
  });
}
