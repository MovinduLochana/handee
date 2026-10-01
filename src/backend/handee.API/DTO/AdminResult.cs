namespace handee.API.DTO;

public record AdminUserResult(
    Guid Id,
    string FullName,
    string? Email,
    string? PhoneNumber,
    bool IsActive,
    string ProviderVerificationStatus,
    DateTimeOffset CreatedAt,
    IList<string> Roles,
    Guid? ProviderProfileId = null
);
