namespace handee.API.Entities;

public class VerificationAuditLog
{
    public Guid Id { get; set; }
    public Guid ProviderProfileId { get; set; }
    public ProviderProfile ProviderProfile { get; set; } = default!;

    public Guid AdminUserId { get; set; }
    public VerificationStatus PreviousStatus { get; set; }
    public VerificationStatus NewStatus { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    public string? Note { get; set; }
}
