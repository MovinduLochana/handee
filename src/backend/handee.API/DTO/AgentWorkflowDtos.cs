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
    string Reply,
    string? Category,
    List<object> SuggestedProviders,
    List<object> SuggestedListings,
    List<string> Suggestions
);
