using Microsoft.AspNetCore.Identity;

namespace handee.API.Entities;

public enum ProviderVerificationStatus
{
    Unverified = 0,
    Pending = 1,
    Verified = 2,
    Rejected = 3,
    InReview = 4
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