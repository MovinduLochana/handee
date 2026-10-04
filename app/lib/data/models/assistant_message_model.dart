import 'provider_profile_model.dart';
import 'service_listing_model.dart';

class AssistantMessageModel {
  final String id;
  final String sender; // "user" or "assistant"
  final String text;
  final DateTime timestamp;
  final List<String> suggestions;
  final List<ProviderProfileModel> recommendedProviders;
  final List<ServiceListingModel> recommendedListings;

  AssistantMessageModel({
    required this.id,
    required this.sender,
    required this.text,
    required this.timestamp,
    this.suggestions = const [],
    this.recommendedProviders = const [],
    this.recommendedListings = const [],
  });

  bool get isUser => sender.toLowerCase() == 'user';
  bool get isAssistant => sender.toLowerCase() == 'assistant';

  factory AssistantMessageModel.user(String text) {
    return AssistantMessageModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: 'user',
      text: text,
      timestamp: DateTime.now(),
    );
  }

  factory AssistantMessageModel.assistant(
    String text, {
    List<String> suggestions = const [],
    List<ProviderProfileModel> recommendedProviders = const [],
    List<ServiceListingModel> recommendedListings = const [],
  }) {
    return AssistantMessageModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: 'assistant',
      text: text,
      timestamp: DateTime.now(),
      suggestions: suggestions,
      recommendedProviders: recommendedProviders,
      recommendedListings: recommendedListings,
    );
  }
}
