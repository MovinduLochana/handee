namespace handee.API.DTO;

public record UserProfileResult(
    Guid Id,
    string FullName,
    string? Email,
    string? PhoneNumber,
    string? ProfilePictureUrl,
    bool IsActive,
    string ProviderVerificationStatus,
    DateTimeOffset CreatedAt,
    IList<string> Roles
);
