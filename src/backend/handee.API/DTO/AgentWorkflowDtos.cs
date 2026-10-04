using System.Text.Json.Serialization;

namespace handee.API.DTO;

public record AgentStepLogDto(
    Guid Id,
    int StepNumber,
    string AgentName,
    string Action,
    string? InputData,
    string? OutputData,
    long DurationMs,
    DateTimeOffset Timestamp
);

public record AgentWorkflowResponseDto(
    Guid Id,
    Guid JobRequestId,
    string WorkflowId,
    string Objective,
    List<string> Plan,
    string ValidationTier,
    string ApprovalStatus,
    decimal? EstimatedPrice,
    Guid? SelectedProviderId,
    string? SelectedProviderName,
    string? FinalResultJson,
    string? DecisionNote,
    DateTimeOffset? DecidedAt,
    DateTimeOffset CreatedAt,
    List<AgentStepLogDto> StepLogs,
    Guid? SelectedServiceListingId = null
);

public record AdminWorkflowDecisionDto(
    string Decision, // "Approve", "Reject", "Revise"
    string? Note
);

public record AssistantQueryRequestDto(
    string Query
);

public record AssistantQueryResponseDto(
    [property: JsonPropertyName("reply")] string Reply,
    [property: JsonPropertyName("category")] string? Category,
    [property: JsonPropertyName("suggested_providers")] List<object>? SuggestedProviders,
    [property: JsonPropertyName("suggested_listings")] List<object>? SuggestedListings,
    [property: JsonPropertyName("suggestions")] List<string> Suggestions
)
{
    [JsonPropertyName("suggestedProviders")]
    public List<object>? SuggestedProvidersCamel => SuggestedProviders;

    [JsonPropertyName("suggestedListings")]
    public List<object>? SuggestedListingsCamel => SuggestedListings;
}
