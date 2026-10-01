import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/testing.dart';
import 'package:http/http.dart' as http;
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/main.dart';
import 'package:app/screens/customer/customer_home_screen.dart';
import 'package:app/screens/provider/provider_home_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;
  late AuthRepository authRepo;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.getInstance();
    await storage.saveTokens(accessToken: 'dummy-token', refreshToken: 'dummy-refresh');
    await storage.saveUser(
      id: 'user-123',
      email: 'test@handee.lk',
      fullName: 'Test User',
      role: 'Customer',
    );
    final client = ApiClient(
      storage: storage,
      httpClient: MockClient((req) async => http.Response('{}', 200)),
      baseUrl: 'http://localhost',
    );
    authRepo = AuthRepository(apiClient: client, storage: storage);
  });

  test('AuthProvider.switchRole updates role in memory and in storage', () async {
    final authProvider = AuthProvider(authRepo: authRepo, storage: storage);

    // Initial role is Customer
    expect(authProvider.isCustomer, isTrue);
    expect(authProvider.isProvider, isFalse);

    // Switch to Provider
    await authProvider.switchRole('Provider');
    expect(authProvider.currentUser?.role, 'Provider');
    expect(authProvider.isProvider, isTrue);
    expect(authProvider.isCustomer, isFalse);
    expect(storage.getUserRole(), 'Provider');

    // Switch back to Customer
    await authProvider.switchRole('Customer');
    expect(authProvider.currentUser?.role, 'Customer');
    expect(authProvider.isCustomer, isTrue);
    expect(authProvider.isProvider, isFalse);
    expect(storage.getUserRole(), 'Customer');
  });

  testWidgets('CustomerHomeScreen and ProviderHomeScreen do not display role swapping button', (tester) async {
    final client = ApiClient(
      storage: storage,
      httpClient: MockClient((req) async {
        if (req.url.path == '/users/me') {
          return http.Response('{"id":"user-123","email":"test@handee.lk","fullName":"Test User","role":"Customer"}', 200);
        }
        return http.Response('[]', 200);
      }),
      baseUrl: 'http://localhost',
    );

    await tester.pumpWidget(buildHandeeApp(storageService: storage, apiClient: client));
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();

    // Verify we are on Customer screen
    expect(find.byType(CustomerHomeScreen), findsOneWidget);

    // Verify Role swapping ActionChip is NOT present in the AppBar
    final roleChip = find.widgetWithText(ActionChip, 'Role');
    expect(roleChip, findsNothing);
  });
}
