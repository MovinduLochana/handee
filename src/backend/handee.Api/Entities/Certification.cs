namespace handee.API.Entities;

public enum CertificationType
{
    NIC,
    TradeCertification,
    Other
}

public enum DocumentReviewStatus
{
    Pending,
    Approved,
    Rejected
}

public class Certification
{
    public Guid Id { get; set; }
    public Guid ProviderProfileId { get; set; }
    public ProviderProfile ProviderProfile { get; set; } = default!;

    public CertificationType Type { get; set; }
    public string FileUrl { get; set; } = default!;
    public string? OriginalFileName { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
    public DocumentReviewStatus ReviewStatus { get; set; } = DocumentReviewStatus.Pending;
}
