namespace handee.API.Entities;

public class AgentWorkflow
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid JobRequestId { get; set; }
    public string WorkflowId { get; set; } = default!;
    public string Objective { get; set; } = default!;

    public List<string> Plan { get; set; } = new();

    /// <summary>
    /// Risk tier evaluated by Validation/Safety Agent:
    /// approved_for_auto_dispatch | approved_with_audit | requires_human_approval
    /// </summary>
    public string ValidationTier { get; set; } = "requires_human_approval";

    /// <summary>
    /// HITL approval status: pending | approved | rejected | revised
    /// </summary>
    public string ApprovalStatus { get; set; } = "pending";

    public decimal? EstimatedPrice { get; set; }
    public Guid? SelectedProviderId { get; set; }

    public string? FinalResultJson { get; set; }
    public string? DecisionNote { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
    public Guid? DecidedByAdminId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public JobRequest JobRequest { get; set; } = default!;
    public ApplicationUser? SelectedProvider { get; set; }
    public ICollection<AgentStepLog> StepLogs { get; set; } = new List<AgentStepLog>();
}
