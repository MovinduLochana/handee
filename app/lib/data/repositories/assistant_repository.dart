import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/assistant_message_model.dart';
import '../models/provider_profile_model.dart';
import '../models/service_listing_model.dart';

class AssistantRepository {
  final ApiClient apiClient;
  final http.Client _httpClient;

  AssistantRepository({
    required this.apiClient,
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? apiClient.httpClient;

  Future<AssistantMessageModel> queryAssistant(String userPrompt) async {
    // 1. Primary: Direct query to Python Agent Service (exact same pattern as Web React portal)
    try {
      final agentUri = Uri.parse('${ApiEndpoints.agentBaseUrl}/api/v1/assistant/query');
      final res = await _httpClient
          .post(
            agentUri,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'customer_id': apiClient.storage.getUserId() ?? 'guest-customer',
              'query': userPrompt,
            }),
          )
          .timeout(const Duration(seconds: 15));

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map) {
          final model = _parseAssistantResponse(Map<String, dynamic>.from(decoded));
          if (model.recommendedProviders.isNotEmpty || model.recommendedListings.isNotEmpty) {
            return model;
          }
        }
      }
    } catch (e) {
      debugPrint('Direct AI agent service query error: $e. Falling back to backend.');
    }

    // 2. Fallback: Query ASP.NET Core Backend mediated endpoint
    try {
      final response = await apiClient.post(
        ApiEndpoints.assistantQuery,
        body: {'query': userPrompt},
      );

      if (response is Map) {
        final model = _parseAssistantResponse(Map<String, dynamic>.from(response));
        // If backend returned empty/null providers & listings, enrich via provider search
        if (model.recommendedProviders.isEmpty && model.recommendedListings.isEmpty) {
          return await _fallbackEnrichment(model, userPrompt);
        }
        return model;
      }
    } catch (e) {
      debugPrint('Backend assistant query error: $e');
    }

    // 3. Last-resort fallback: provide helpful guidance
    return AssistantMessageModel.assistant(
      'I can help connect you with verified tradespeople across Sri Lanka. Browse categories or search for specialists directly.',
      suggestions: const ['Find a Plumber in Colombo', 'AC Service & Repair cost', 'Electrician rates in Colombo'],
    );
  }

  AssistantMessageModel _parseAssistantResponse(Map<String, dynamic> data) {
    final providersRaw = (data['suggested_providers'] as List<dynamic>?) ??
        (data['suggestedProviders'] as List<dynamic>?);
    final providers = providersRaw?.map((e) {
      if (e is Map) {
        try {
          return ProviderProfileModel.fromJson(Map<String, dynamic>.from(e));
        } catch (err) {
          debugPrint('Error parsing provider in assistant: $err');
          return null;
        }
      }
      return null;
    }).whereType<ProviderProfileModel>().toList() ?? [];

    final listingsRaw = (data['suggested_listings'] as List<dynamic>?) ??
        (data['suggestedListings'] as List<dynamic>?);
    final listings = listingsRaw?.map((e) {
      if (e is Map) {
        try {
          return ServiceListingModel.fromJson(Map<String, dynamic>.from(e));
        } catch (err) {
          debugPrint('Error parsing listing in assistant: $err');
          return null;
        }
      }
      return null;
    }).whereType<ServiceListingModel>().toList() ?? [];

    final suggestionsRaw = data['suggestions'] as List<dynamic>?;
    final suggestions = suggestionsRaw
            ?.map((e) => e.toString())
            .where((sug) {
              final lower = sug.toLowerCase();
              return !lower.contains('instant match') &&
                  !lower.contains('priority') &&
                  !lower.contains('emergency book');
            })
            .map((sug) {
              if (sug.toLowerCase().startsWith('book ')) {
                return 'View ${sug.substring(5)}';
              }
              return sug;
            })
            .toList() ??
        [];

    return AssistantMessageModel.assistant(
      data['reply']?.toString() ?? 'Here are the available providers for your request.',
      suggestions: suggestions,
      recommendedProviders: providers,
      recommendedListings: listings,
    );
  }

  Future<AssistantMessageModel> _fallbackEnrichment(AssistantMessageModel model, String query) async {
    try {
      final searchRes = await apiClient.get(
        ApiEndpoints.providersSearch,
        queryParams: {'searchTerm': query, 'radiusKm': 30},
      );
      if (searchRes is Map && searchRes['items'] is List) {
        final items = searchRes['items'] as List;
        final providers = items
            .map((e) {
              if (e is Map) {
                try {
                  return ProviderProfileModel.fromJson(Map<String, dynamic>.from(e));
                } catch (_) {
                  return null;
                }
              }
              return null;
            })
            .whereType<ProviderProfileModel>()
            .take(3)
            .toList();

        if (providers.isNotEmpty) {
          return AssistantMessageModel.assistant(
            model.text,
            suggestions: model.suggestions,
            recommendedProviders: providers,
            recommendedListings: model.recommendedListings,
          );
        }
      }
    } catch (e) {
      debugPrint('Fallback provider enrichment error: $e');
    }
    return model;
  }
}
