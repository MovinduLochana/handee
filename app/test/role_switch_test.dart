import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/testing.dart';
import 'package:http/http.dart' as http;
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/widgets/role_switch_sheet.dart';
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

  testWidgets('RoleSwitchSheet navigates from Customer to Provider home screen', (tester) async {
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

    // Tap Role chip to open switch modal
    final roleChip = find.widgetWithText(ActionChip, 'Role');
    expect(roleChip, findsOneWidget);
    await tester.tap(roleChip);
    await tester.pumpAndSettle();

    // Verify RoleSwitchSheet modal is shown
    expect(find.byType(RoleSwitchSheet), findsOneWidget);
    expect(find.text('Service Provider Experience (Field App)'), findsOneWidget);

    // Tap Provider option
    await tester.tap(find.text('Service Provider Experience (Field App)'));
    await tester.pumpAndSettle();

    // Verify it navigated to ProviderHomeScreen
    expect(find.byType(ProviderHomeScreen), findsOneWidget);
    expect(find.byType(CustomerHomeScreen), findsNothing);

    // Now tap Role chip on ProviderHomeScreen to switch back
    final providerRoleChip = find.widgetWithText(ActionChip, 'Role');
    expect(providerRoleChip, findsOneWidget);
    await tester.tap(providerRoleChip);
    await tester.pumpAndSettle();

    // Verify modal is shown and tap Customer Experience
    expect(find.byType(RoleSwitchSheet), findsOneWidget);
    await tester.tap(find.text('Customer Experience'));
    await tester.pumpAndSettle();

    // Verify it navigated back to CustomerHomeScreen
    expect(find.byType(CustomerHomeScreen), findsOneWidget);
    expect(find.byType(ProviderHomeScreen), findsNothing);
  });
}
