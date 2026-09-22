namespace handee.API.Entities;

public enum JobUrgency
{
    Low,
    Medium,
    High,
    Emergency
}

/// <summary>Starts at PendingAiReview: new requests are triaged by the agentic
/// AI service (category/scope classification) before customers see them as
/// Open listings.</summary>
public enum JobRequestStatus
{
    PendingAiReview,
    Open,
    Cancelled
}

public class JobRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ServiceCategoryId { get; set; }
    public string Description { get; set; } = default!;
    public List<string> PhotoUrls { get; set; } = new();
    public string Location { get; set; } = default!;
    public JobUrgency Urgency { get; set; } = JobUrgency.Medium;

    public decimal? BudgetMin { get; set; }
    public decimal? BudgetMax { get; set; }

    public JobRequestStatus Status { get; set; } = JobRequestStatus.PendingAiReview;

    public Guid CustomerId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    // Navigation properties
    public ApplicationUser Customer { get; set; } = default!;
    public ServiceCategory ServiceCategory { get; set; } = default!;
}
