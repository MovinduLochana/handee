using Microsoft.AspNetCore.Identity;

namespace handee.API.Entities;

public enum ProviderVerificationStatus
{
    Unverified,
    Pending,
    InReview,
    Verified,
    Rejected
}

public class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? ProfilePictureUrl { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Only meaningful for Provider-role users.</summary>
    public ProviderVerificationStatus ProviderVerificationStatus { get; set; }
        = ProviderVerificationStatus.Unverified;

    public virtual ICollection<ServiceListing> ServiceListings { get; set; } = new List<ServiceListing>();
}