namespace handee.API.Entities;

public enum WorkflowValidationTier
{
    RequiresHumanApproval,
    ApprovedForAutoDispatch,
    ApprovedWithAudit
}

public enum WorkflowApprovalStatus
{
    Pending,
    Approved,
    Rejected,
    Revised
}

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
    public WorkflowValidationTier ValidationTier { get; set; } = WorkflowValidationTier.RequiresHumanApproval;

    /// <summary>
    /// HITL approval status: pending | approved | rejected | revised
    /// </summary>
    public WorkflowApprovalStatus ApprovalStatus { get; set; } = WorkflowApprovalStatus.Pending;

    public static WorkflowValidationTier ParseValidationTier(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "approved_for_auto_dispatch" or "approvedforautodispatch" => WorkflowValidationTier.ApprovedForAutoDispatch,
        "approved_with_audit" or "approvedwithaudit" => WorkflowValidationTier.ApprovedWithAudit,
        _ => WorkflowValidationTier.RequiresHumanApproval
    };

    public static string FormatValidationTier(WorkflowValidationTier tier) => tier switch
    {
        WorkflowValidationTier.ApprovedForAutoDispatch => "approved_for_auto_dispatch",
        WorkflowValidationTier.ApprovedWithAudit => "approved_with_audit",
        _ => "requires_human_approval"
    };

    public static WorkflowApprovalStatus ParseApprovalStatus(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "approved" or "approve" => WorkflowApprovalStatus.Approved,
        "rejected" or "reject" => WorkflowApprovalStatus.Rejected,
        "revised" or "revise" => WorkflowApprovalStatus.Revised,
        _ => WorkflowApprovalStatus.Pending
    };

    public static string FormatApprovalStatus(WorkflowApprovalStatus status) => status switch
    {
        WorkflowApprovalStatus.Approved => "approved",
        WorkflowApprovalStatus.Rejected => "rejected",
        WorkflowApprovalStatus.Revised => "revised",
        _ => "pending"
    };

    public decimal? EstimatedPrice { get; set; }
    public Guid? SelectedProviderId { get; set; }
    public Guid? SelectedServiceListingId { get; set; }

    public string? FinalResultJson { get; set; }
    public string? DecisionNote { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
    public Guid? DecidedByAdminId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public JobRequest JobRequest { get; set; } = default!;
    public ApplicationUser? SelectedProvider { get; set; }
    public ServiceListing? SelectedServiceListing { get; set; }
    public ICollection<AgentStepLog> StepLogs { get; set; } = new List<AgentStepLog>();
}
