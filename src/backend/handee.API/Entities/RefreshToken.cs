using handee.API.Entities;

namespace handee.API.Entities;

public class RefreshToken
{
    public Guid RefreshTokenId { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = default!;
    public Guid FamilyId { get; set; }
    public DateTimeOffset IssuedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public bool Used { get; set; } = false;
    public DateTimeOffset? RevokedAt { get; set; }
    public string? CreatedByIp { get; set; }
    
    // Navigation property
    public ApplicationUser User { get; set; } = default!;
}