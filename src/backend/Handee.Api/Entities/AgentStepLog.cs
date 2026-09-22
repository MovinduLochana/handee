namespace handee.API.Entities;

public class AgentStepLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AgentWorkflowId { get; set; }
    public int StepNumber { get; set; }
    public string AgentName { get; set; } = default!;
    public string Action { get; set; } = default!;

    public string? InputData { get; set; }
    public string? OutputData { get; set; }

    public long DurationMs { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

    // Navigation property
    public AgentWorkflow AgentWorkflow { get; set; } = default!;
}
