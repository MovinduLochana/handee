using handee.API.Data;
using handee.API.DTO.Provider;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Services;

public class ProviderProfileService(
    IProviderProfileRepository profileRepo,
    ICertificationRepository certRepo,
    IStorageService storage,
    IGoogleMapsService maps,
    VerificationService verificationService,
    AppDbContext db,
    ILogger<ProviderProfileService> logger)
{
    // ─── Reads ────────────────────────────────────────────────────────────

    public async Task<object> GetProfileAsync(Guid id, string callerRole, CancellationToken ct = default)
    {
        var profile = await profileRepo.GetByIdAsync(id, ct)
            ?? throw new KeyNotFoundException($"ProviderProfile {id} not found.");

        return callerRole switch
        {
            "Admin"    => MapToAdminDto(profile),
            "Provider" => MapToProviderDto(profile),
            _          => MapToCustomerDto(profile) // Customer or anonymous
        };
    }

    // ─── Update profile ───────────────────────────────────────────────────

    public async Task UpdateProfileAsync(Guid id, UpdateProviderProfileDto dto, CancellationToken ct = default)
    {
        var profile = await profileRepo.GetByIdAsync(id, ct)
            ?? throw new KeyNotFoundException($"ProviderProfile {id} not found.");

        if (dto.Headline is not null)          profile.Headline = dto.Headline;
        if (dto.Bio is not null)               profile.Bio = dto.Bio;
        if (dto.Description is not null)       profile.Description = dto.Description;
        if (dto.YearsOfExperience.HasValue)    profile.YearsOfExperience = dto.YearsOfExperience.Value;
        if (dto.Languages is not null)         profile.Languages = dto.Languages;
        if (dto.ServicesOffered is not null)   profile.ServicesOffered = dto.ServicesOffered;
        if (dto.IsAvailableForWork.HasValue)   profile.IsAvailableForWork = dto.IsAvailableForWork.Value;
        if (dto.AvailabilityNote is not null)  profile.AvailabilityNote = dto.AvailabilityNote;

        // Update skill categories
        if (dto.SkillCategoryIds is not null)
        {
            var categories = await db.SkillCategories
                .Where(s => dto.SkillCategoryIds.Contains(s.Id))
                .ToListAsync(ct);
            profile.SkillCategories = categories;
        }

        // Update service area
        if (dto.ServiceAreaLatitude.HasValue && dto.ServiceAreaLongitude.HasValue)
        {
            profile.ServiceAreaLatitude = dto.ServiceAreaLatitude.Value;
            profile.ServiceAreaLongitude = dto.ServiceAreaLongitude.Value;
            profile.ServiceAreaDisplayName = dto.ServiceAreaAddress;
        }
        else if (!string.IsNullOrEmpty(dto.ServiceAreaAddress))
        {
            var geoResult = await maps.GeocodeAsync(dto.ServiceAreaAddress, ct);
            if (geoResult.HasValue)
            {
                profile.ServiceAreaLatitude = geoResult.Value.Lat;
                profile.ServiceAreaLongitude = geoResult.Value.Lng;
                profile.ServiceAreaDisplayName = geoResult.Value.DisplayName;
            }
            else
            {
                logger.LogWarning("Geocoding failed for address: {Address} — service area not updated", dto.ServiceAreaAddress);
            }
        }

        await profileRepo.SaveChangesAsync(ct);
    }

    // ─── Document upload ─────────────────────────────────────────────────

    public async Task<Certification> UploadDocumentAsync(
        Guid profileId, DocumentUploadDto dto, CancellationToken ct = default)
    {
        var profile = await profileRepo.GetByIdAsync(profileId, ct)
            ?? throw new KeyNotFoundException($"ProviderProfile {profileId} not found.");

        var fileUrl = await storage.UploadAsync(dto.File, "certifications", ct);

        var cert = new Certification
        {
            Id = Guid.NewGuid(),
            ProviderProfileId = profileId,
            Type = dto.Type,
            FileUrl = fileUrl,
            OriginalFileName = dto.File.FileName,
            UploadedAt = DateTimeOffset.UtcNow,
            ReviewStatus = DocumentReviewStatus.Pending
        };

        await certRepo.AddAsync(cert, ct);
        await certRepo.SaveChangesAsync(ct);

        // If provider was Rejected, a new document submission moves them back to Pending
        if (profile.VerificationStatus == VerificationStatus.Rejected)
        {
            await verificationService.ResubmitAsync(profileId, ct);
            logger.LogInformation("Provider {ProfileId} resubmitted document — status reset to Pending", profileId);
        }
        // If brand-new profile (no profile yet), initial upload creates it in Pending — handled in CreateProfileAsync
        else if (profile.VerificationStatus == VerificationStatus.Pending)
        {
            logger.LogInformation("Document uploaded for pending provider {ProfileId}", profileId);
        }

        return cert;
    }

    // ─── Create profile (called on provider first registration) ──────────

    public async Task<ProviderProfile> CreateProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var existing = await profileRepo.GetByUserIdAsync(userId, ct);
        if (existing is not null) return existing;  // idempotent

        var profile = new ProviderProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            VerificationStatus = VerificationStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await profileRepo.AddAsync(profile, ct);
        await profileRepo.SaveChangesAsync(ct);
        return profile;
    }

    // ─── Delegated helpers ─────────────────────────────────────────────

    public async Task<Guid?> GetOwnerUserIdAsync(Guid profileId, CancellationToken ct = default) =>
        await profileRepo.GetOwnerUserIdAsync(profileId, ct);

    public async Task<List<ProviderProfileCustomerDto>> SearchAsync(
        Guid? skillCategoryId, double? lat, double? lng, double radiusKm, CancellationToken ct = default)
    {
        var results = await profileRepo.SearchAsync(skillCategoryId, lat, lng, radiusKm, ct);
        return results.Select(MapToCustomerDto).ToList();
    }

    // ─── Mapping helpers ─────────────────────────────────────────────────

    private static ProviderProfileCustomerDto MapToCustomerDto(ProviderProfile p) => new(
        Id: p.Id,
        FullName: p.User.FullName,
        Headline: p.Headline,
        Bio: p.Bio,
        Description: p.Description,
        YearsOfExperience: p.YearsOfExperience,
        ProfilePhotoUrl: p.ProfilePhotoUrl,
        Languages: p.Languages,
        ServicesOffered: p.ServicesOffered,
        IsAvailableForWork: p.IsAvailableForWork,
        AvailabilityNote: p.AvailabilityNote,
        SkillCategories: p.SkillCategories.Select(s => new SkillCategoryDto(s.Id, s.Name, s.IconUrl)).ToList(),
        ServiceAreaDisplayName: p.ServiceAreaDisplayName,
        ServiceRadiusKm: p.ServiceRadiusKm,
        VerificationStatus: p.VerificationStatus,
        RatingAggregate: p.RatingAggregate,
        TotalReviewCount: p.TotalReviewCount,
        CreatedAt: p.CreatedAt);

    private static ProviderProfileProviderDto MapToProviderDto(ProviderProfile p) => new(
        Id: p.Id,
        UserId: p.UserId,
        FullName: p.User.FullName,
        Email: p.User.Email,
        Headline: p.Headline,
        Bio: p.Bio,
        Description: p.Description,
        YearsOfExperience: p.YearsOfExperience,
        ProfilePhotoUrl: p.ProfilePhotoUrl,
        Languages: p.Languages,
        ServicesOffered: p.ServicesOffered,
        IsAvailableForWork: p.IsAvailableForWork,
        AvailabilityNote: p.AvailabilityNote,
        SkillCategories: p.SkillCategories.Select(s => new SkillCategoryDto(s.Id, s.Name, s.IconUrl)).ToList(),
        ServiceAreaLatitude: p.ServiceAreaLatitude,
        ServiceAreaLongitude: p.ServiceAreaLongitude,
        ServiceAreaDisplayName: p.ServiceAreaDisplayName,
        ServiceRadiusKm: p.ServiceRadiusKm,
        VerificationStatus: p.VerificationStatus,
        RatingAggregate: p.RatingAggregate,
        TotalReviewCount: p.TotalReviewCount,
        CreatedAt: p.CreatedAt,
        Certifications: p.Certifications.Select(c => new CertificationDto(
            c.Id, c.Type, c.FileUrl, c.OriginalFileName, c.UploadedAt, c.ReviewStatus)).ToList());

    private static ProviderProfileAdminDto MapToAdminDto(ProviderProfile p) => new(
        Id: p.Id,
        UserId: p.UserId,
        FullName: p.User.FullName,
        Email: p.User.Email,
        Headline: p.Headline,
        Bio: p.Bio,
        Description: p.Description,
        YearsOfExperience: p.YearsOfExperience,
        ProfilePhotoUrl: p.ProfilePhotoUrl,
        Languages: p.Languages,
        ServicesOffered: p.ServicesOffered,
        IsAvailableForWork: p.IsAvailableForWork,
        AvailabilityNote: p.AvailabilityNote,
        SkillCategories: p.SkillCategories.Select(s => new SkillCategoryDto(s.Id, s.Name, s.IconUrl)).ToList(),
        ServiceAreaLatitude: p.ServiceAreaLatitude,
        ServiceAreaLongitude: p.ServiceAreaLongitude,
        ServiceAreaDisplayName: p.ServiceAreaDisplayName,
        ServiceRadiusKm: p.ServiceRadiusKm,
        VerificationStatus: p.VerificationStatus,
        RatingAggregate: p.RatingAggregate,
        TotalReviewCount: p.TotalReviewCount,
        CreatedAt: p.CreatedAt,
        Certifications: p.Certifications.Select(c => new CertificationDto(
            c.Id, c.Type, c.FileUrl, c.OriginalFileName, c.UploadedAt, c.ReviewStatus)).ToList(),
        AuditLogs: p.AuditLogs.OrderByDescending(a => a.Timestamp).Select(a => new AuditLogDto(
            a.Id, a.AdminUserId, a.PreviousStatus, a.NewStatus, a.Timestamp, a.Note)).ToList());
}
