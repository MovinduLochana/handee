import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/assistant_message_model.dart';

class AssistantRepository {
  final ApiClient apiClient;

  AssistantRepository({
    required this.apiClient,
  });

  Future<AssistantMessageModel> queryAssistant(String userPrompt) async {
    final response = await apiClient.post(
      ApiEndpoints.assistantQuery,
      body: {'query': userPrompt},
    );

    if (response is Map<String, dynamic>) {
      return AssistantMessageModel.assistant(
        response['reply']?.toString() ?? 'Here are the available providers for your request.',
        suggestions: (response['suggestions'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
      );
    }
    throw ApiException(statusCode: 400, message: 'Invalid assistant response');
  }
}
