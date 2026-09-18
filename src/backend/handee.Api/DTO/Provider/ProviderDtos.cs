using handee.API.Entities;

namespace handee.API.DTO.Provider;

// ─── Shared sub-objects ────────────────────────────────────────────────────

public record SkillCategoryDto(Guid Id, string Name, string? IconUrl);

public record CertificationDto(
    Guid Id,
    CertificationType Type,
    string FileUrl,
    string? OriginalFileName,
    DateTimeOffset UploadedAt,
    DocumentReviewStatus ReviewStatus);

public record AuditLogDto(
    Guid Id,
    Guid AdminUserId,
    VerificationStatus PreviousStatus,
    VerificationStatus NewStatus,
    DateTimeOffset Timestamp,
    string? Note);

// ─── Role-scoped profile reads ─────────────────────────────────────────────

/// <summary>Provider's own full view (includes document URLs).</summary>
public record ProviderProfileProviderDto(
    Guid Id,
    Guid UserId,
    string FullName,
    string? Email,
    string? Headline,
    string? Bio,
    string? Description,
    int YearsOfExperience,
    string? ProfilePictureUrl,
    List<string> Languages,
    List<string> ServicesOffered,
    bool IsAvailableForWork,
    string? AvailabilityNote,
    List<SkillCategoryDto> SkillCategories,
    double? ServiceAreaLatitude,
    double? ServiceAreaLongitude,
    string? ServiceAreaDisplayName,
    double ServiceRadiusKm,
    VerificationStatus VerificationStatus,
    decimal RatingAggregate,
    int TotalReviewCount,
    DateTimeOffset CreatedAt,
    List<CertificationDto> Certifications,
    List<AuditLogDto> AuditLogs);

/// <summary>Admin view — adds audit log and document URLs.</summary>
public record ProviderProfileAdminDto(
    Guid Id,
    Guid UserId,
    string FullName,
    string? Email,
    string? Headline,
    string? Bio,
    string? Description,
    int YearsOfExperience,
    string? ProfilePictureUrl,
    List<string> Languages,
    List<string> ServicesOffered,
    bool IsAvailableForWork,
    string? AvailabilityNote,
    List<SkillCategoryDto> SkillCategories,
    double? ServiceAreaLatitude,
    double? ServiceAreaLongitude,
    string? ServiceAreaDisplayName,
    double ServiceRadiusKm,
    VerificationStatus VerificationStatus,
    decimal RatingAggregate,
    int TotalReviewCount,
    DateTimeOffset CreatedAt,
    List<CertificationDto> Certifications,
    List<AuditLogDto> AuditLogs);

/// <summary>
/// Public customer view — NO document URLs, NO raw NIC, NO email.
/// Only safe public fields.
/// </summary>
public record ProviderProfileCustomerDto(
    Guid Id,
    string FullName,
    string? Headline,
    string? Bio,
    string? Description,
    int YearsOfExperience,
    string? ProfilePictureUrl,
    List<string> Languages,
    List<string> ServicesOffered,
    bool IsAvailableForWork,
    string? AvailabilityNote,
    List<SkillCategoryDto> SkillCategories,
    string? ServiceAreaDisplayName,
    double ServiceRadiusKm,
    VerificationStatus VerificationStatus,
    decimal RatingAggregate,
    int TotalReviewCount,
    DateTimeOffset CreatedAt);

// ─── Write DTOs ────────────────────────────────────────────────────────────

/// <summary>PUT /api/providers/{id} — update own profile.</summary>
public record UpdateProviderProfileDto(
    string? Headline,
    string? Bio,
    string? Description,
    int? YearsOfExperience,
    List<string>? Languages,
    List<string>? ServicesOffered,
    bool? IsAvailableForWork,
    string? AvailabilityNote,
    List<Guid>? SkillCategoryIds,
    double? ServiceAreaLatitude,
    double? ServiceAreaLongitude,
    string? ServiceAreaAddress,      // address string to geocode if lat/lng not supplied
    double? ServiceRadiusKm);

/// <summary>PATCH /api/providers/{id}/verification — Admin transition.</summary>
public record VerificationActionDto(
    VerificationStatus NewStatus,
    string? Note);

/// <summary>POST /api/providers/{id}/documents — upload a document.</summary>
public record DocumentUploadDto(
    IFormFile File,
    CertificationType Type);



/// <summary>Internal trust-signal payload consumed by the Python Agentic AI service.</summary>
public record TrustSignalDto(
    Guid ProviderId,
    VerificationStatus VerificationStatus,
    decimal RatingAggregate,
    int TotalReviewCount,
    int AccountAgeDays,
    bool IsAvailableForWork);
