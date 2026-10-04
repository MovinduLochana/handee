import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:app/data/models/assistant_message_model.dart';
import 'package:app/data/models/provider_profile_model.dart';
import 'package:app/data/models/service_listing_model.dart';
import 'package:app/data/repositories/assistant_repository.dart';
import 'package:app/data/repositories/provider_repository.dart';
import 'package:app/data/repositories/service_listing_repository.dart';
import 'package:app/providers/assistant_provider.dart';
import 'package:app/providers/service_directory_provider.dart';
import 'package:app/screens/customer/assistant_chat_screen.dart';
import 'package:app/screens/customer/public_provider_profile_screen.dart';
import 'package:app/screens/customer/service_listing_details_screen.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeAssistantRepository extends AssistantRepository {
  FakeAssistantRepository({required ApiClient client})
      : super(apiClient: client);

  @override
  Future<AssistantMessageModel> queryAssistant(String userPrompt) async {
    return AssistantMessageModel.assistant(
      'I found Plumbing services on Handee! Recommended listing: Fast Plumbing by Provider2.',
      suggestions: ['View Plumbing Pricing Guide', 'View Fast Plumbing (Rs. 8,000)'],
      recommendedProviders: [
        ProviderProfileModel(
          id: 'prov-001',
          userId: 'user-001',
          fullName: 'Provider2',
          skillCategories: ['Plumbing'],
          serviceArea: 'Colombo',
          rating: 4.9,
          totalReviews: 8,
          isVerified: true,
        ),
      ],
      recommendedListings: [
        ServiceListingModel(
          id: 'list-001',
          providerId: 'prov-001',
          serviceCategoryId: 'cat-001',
          title: 'Fast Plumbing',
          description: 'Emergency leak detection and plumbing',
          scope: 'Residential plumbing',
          availability: 'Immediate',
          fixedPrice: 8000.0,
          estimatedDuration: '01:00:00',
          isActive: true,
          providerFullName: 'Provider2',
        ),
      ],
    );
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.getInstance();
  });

  testWidgets('AssistantChatScreen renders View Profile and View Service buttons and navigates', (tester) async {
    final client = ApiClient(storage: storage, baseUrl: 'http://localhost');
    final providerRepo = ProviderRepository(apiClient: client);
    final listingRepo = ServiceListingRepository(apiClient: client);
    final dirProvider = ServiceDirectoryProvider(
      providerRepo: providerRepo,
      serviceListingRepo: listingRepo,
    );

    final fakeRepo = FakeAssistantRepository(client: client);
    final assistantProvider = AssistantProvider(repository: fakeRepo);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AssistantProvider>.value(value: assistantProvider),
          ChangeNotifierProvider<ServiceDirectoryProvider>.value(value: dirProvider),
        ],
        child: const MaterialApp(
          home: AssistantChatScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify welcome message is rendered
    expect(find.text('Handee AI Assistant'), findsOneWidget);

    // Send a query
    await assistantProvider.sendMessage('Find a Plumber in Colombo');
    await tester.pumpAndSettle();

    // Verify response text
    expect(find.textContaining('Fast Plumbing by Provider2'), findsOneWidget);

    // Verify "View Profile" button exists and NO "Book" button exists
    expect(find.text('View Profile'), findsOneWidget);
    expect(find.text('View Service'), findsOneWidget);
    expect(find.text('Book'), findsNothing);
    expect(find.text('Instant Match'), findsNothing);

    // Verify tapping "View Profile" navigates to PublicProviderProfileScreen
    await tester.tap(find.text('View Profile'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(PublicProviderProfileScreen), findsOneWidget);
  });

  testWidgets('AssistantChatScreen tapping View Service navigates to ServiceListingDetailsScreen', (tester) async {
    final client = ApiClient(storage: storage, baseUrl: 'http://localhost');
    final fakeRepo = FakeAssistantRepository(client: client);
    final assistantProvider = AssistantProvider(repository: fakeRepo);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AssistantProvider>.value(value: assistantProvider),
        ],
        child: const MaterialApp(
          home: AssistantChatScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await assistantProvider.sendMessage('Find a Plumber');
    await tester.pumpAndSettle();

    expect(find.text('View Service'), findsOneWidget);
    await tester.ensureVisible(find.text('View Service'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('View Service'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(ServiceListingDetailsScreen), findsOneWidget);
  });
}
