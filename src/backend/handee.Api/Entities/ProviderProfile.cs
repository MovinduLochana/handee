namespace handee.API.Entities;

public enum VerificationStatus
{
    Pending,
    InReview,
    Verified,
    Rejected
}

public class ProviderProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = default!;

    // ── Professional Profile ─────────────────────────────────────────────
    public string? Headline { get; set; }
    public string? Bio { get; set; }
    public string? Description { get; set; }
    public int YearsOfExperience { get; set; }

    public List<string> Languages { get; set; } = [];
    public List<string> ServicesOffered { get; set; } = [];
    public bool IsAvailableForWork { get; set; } = true;
    public string? AvailabilityNote { get; set; }

    // ── Skill Categorisation ─────────────────────────────────────────────
    public ICollection<SkillCategory> SkillCategories { get; set; } = [];

    // ── Service Area ─────────────────────────────────────────────────────
    public double? ServiceAreaLatitude { get; set; }
    public double? ServiceAreaLongitude { get; set; }
    public string? ServiceAreaDisplayName { get; set; }
    public double ServiceRadiusKm { get; set; } = 25;

    // ── Verification & Trust ──────────────────────────────────────────────
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;
    public decimal RatingAggregate { get; set; } = 0m;
    public int TotalReviewCount { get; set; } = 0;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Certification> Certifications { get; set; } = [];
    public ICollection<VerificationAuditLog> AuditLogs { get; set; } = [];
    public ICollection<Review> Reviews { get; set; } = [];
}
