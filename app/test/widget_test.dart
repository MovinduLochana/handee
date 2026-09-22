import 'package:flutter_test/flutter_test.dart';
import 'package:app/main.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('HandeeApp smoke test and splash screen display', (WidgetTester tester) async {
    final storageService = await StorageService.getInstance();
    await tester.pumpWidget(buildHandeeApp(storageService: storageService));

    // Verify splash brand text is rendered
    expect(find.text('Handee'), findsOneWidget);
    expect(find.text('Verified Tradespeople · Sri Lanka'), findsOneWidget);

    // Drain timer to complete splash transition
    await tester.pump(const Duration(seconds: 3));
  });
}
