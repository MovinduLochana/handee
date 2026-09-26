using handee.API.Data;
using handee.API.DTO;
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
    IVerificationService verificationService,
    AppDbContext db,
    ILogger<ProviderProfileService> logger) : IProviderProfileService
{
    // ─── Reads ────────────────────────────────────────────────────────────

    public async Task<object?> GetProfileAsync(Guid id, string callerRole, CancellationToken ct = default)
    {
        var profile = await profileRepo.GetByIdAsync(id, ct);
        if (profile is null)
        {
            // Return null so callers (controllers) can decide how to respond (404 Not Found)
            return null;
        }

        return callerRole switch
        {
            "Admin"    => MapToAdminDto(profile),
            "Provider" => MapToProviderDto(profile),
            _          => MapToCustomerDto(profile) // Customer or anonymous
        };
    }

    public async Task<ProviderProfileProviderDto> GetProfileByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var profile = await profileRepo.GetByUserIdAsync(userId, ct)
            ?? throw new KeyNotFoundException($"No provider profile found for user {userId}.");

        return MapToProviderDto(profile);
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

        // Update service categories
        if (dto.ServiceCategoryIds is not null)
        {
            var categories = await db.ServiceCategories
                .Where(s => dto.ServiceCategoryIds.Contains(s.Id))
                .ToListAsync(ct);

            profile.ServiceCategories ??= new List<ServiceCategory>();
            profile.ServiceCategories.Clear();
            foreach (var category in categories)
            {
                profile.ServiceCategories.Add(category);
            }
        }

        // Update service area
        if (dto.ServiceAreaLatitude.HasValue && dto.ServiceAreaLongitude.HasValue)
        {
            profile.ServiceAreaLatitude = dto.ServiceAreaLatitude.Value;
            profile.ServiceAreaLongitude = dto.ServiceAreaLongitude.Value;
        }

        if (dto.ServiceRadiusKm.HasValue)      profile.ServiceRadiusKm = dto.ServiceRadiusKm.Value;

        // Address fields
        if (dto.AddressLine1 is not null)  profile.AddressLine1 = dto.AddressLine1;
        if (dto.AddressLine2 is not null)  profile.AddressLine2 = dto.AddressLine2;
        if (dto.City is not null)          { profile.City = dto.City; profile.ServiceAreaDisplayName = dto.City; }
        if (dto.State is not null)         profile.State = dto.State;
        if (dto.PostalCode is not null)    profile.PostalCode = dto.PostalCode;
        if (dto.Country is not null)       profile.Country = dto.Country;

        await profileRepo.SaveChangesAsync(ct);
    }

    // ─── Document upload ─────────────────────────────────────────────────

    public async Task<Certification> UploadDocumentAsync(
        Guid profileId, DocumentUploadDto dto, CancellationToken ct = default)
    {
        var profile = await profileRepo.GetByIdAsync(profileId, ct)
            ?? throw new KeyNotFoundException($"ProviderProfile {profileId} not found.");

        var fileUrl = await storage.UploadAsync(dto.File, "certifications", ct);

        var existingCert = profile.Certifications.FirstOrDefault(c => c.Type == dto.Type);
        Certification cert;
        
        if (existingCert != null)
        {
            existingCert.FileUrl = fileUrl;
            existingCert.OriginalFileName = dto.File.FileName;
            existingCert.UploadedAt = DateTimeOffset.UtcNow;
            existingCert.ReviewStatus = DocumentReviewStatus.Pending;
            cert = existingCert;
            await certRepo.SaveChangesAsync(ct);
        }
        else
        {
            cert = new Certification
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
        }

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

    public async Task<PagedResult<ProviderProfileCustomerDto>> SearchAsync(
        string? searchTerm, Guid? serviceCategoryId, double? lat, double? lng, double radiusKm,
        int skip, int take, CancellationToken ct = default)
    {
        var (items, totalCount) = await profileRepo.SearchAsync(searchTerm, serviceCategoryId, lat, lng, radiusKm, skip, take, ct);
        var page = skip / take + 1;
        return new PagedResult<ProviderProfileCustomerDto>(
            items.Select(MapToCustomerDto).ToList(),
            totalCount,
            page,
            take);
    }

    // ─── Mapping helpers ─────────────────────────────────────────────────

    private static ProviderProfileCustomerDto MapToCustomerDto(ProviderProfile p) => new(
        Id: p.Id,
        FullName: p.User.FullName,
        Headline: p.Headline,
        Bio: p.Bio,
        Description: p.Description,
        YearsOfExperience: p.YearsOfExperience,
        ProfilePictureUrl: p.User.ProfilePictureUrl,
        Languages: p.Languages,
        ServicesOffered: p.ServicesOffered,
        IsAvailableForWork: p.IsAvailableForWork,
        AvailabilityNote: p.AvailabilityNote,
        ServiceCategories: p.ServiceCategories.Select(s => new ServiceCategoryResponseDto(s.Id, s.Name, s.IconUrl, s.PriceBandMin, s.PriceBandMax)).ToList(),
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
        ProfilePictureUrl: p.User.ProfilePictureUrl,
        Languages: p.Languages,
        ServicesOffered: p.ServicesOffered,
        IsAvailableForWork: p.IsAvailableForWork,
        AvailabilityNote: p.AvailabilityNote,
        ServiceCategories: p.ServiceCategories.Select(s => new ServiceCategoryResponseDto(s.Id, s.Name, s.IconUrl, s.PriceBandMin, s.PriceBandMax)).ToList(),
        ServiceAreaLatitude: p.ServiceAreaLatitude,
        ServiceAreaLongitude: p.ServiceAreaLongitude,
        ServiceAreaDisplayName: p.ServiceAreaDisplayName,
        ServiceRadiusKm: p.ServiceRadiusKm,
        AddressLine1: p.AddressLine1,
        AddressLine2: p.AddressLine2,
        City: p.City,
        State: p.State,
        PostalCode: p.PostalCode,
        Country: p.Country,
        VerificationStatus: p.VerificationStatus,
        RatingAggregate: p.RatingAggregate,
        TotalReviewCount: p.TotalReviewCount,
        CreatedAt: p.CreatedAt,
        Certifications: p.Certifications.Select(c => new CertificationDto(
            c.Id, c.Type, c.FileUrl, c.OriginalFileName, c.UploadedAt, c.ReviewStatus)).ToList(),
        AuditLogs: p.AuditLogs.OrderByDescending(a => a.Timestamp).Select(a => new AuditLogDto(
            a.Id, a.AdminUserId, a.PreviousStatus, a.NewStatus, a.Timestamp, a.Note)).ToList());

    public static ProviderProfileAdminDto MapToAdminDto(ProviderProfile p) => new(
        Id: p.Id,
        UserId: p.UserId,
        FullName: p.User.FullName,
        Email: p.User.Email,
        Headline: p.Headline,
        Bio: p.Bio,
        Description: p.Description,
        YearsOfExperience: p.YearsOfExperience,
        ProfilePictureUrl: p.User.ProfilePictureUrl,
        Languages: p.Languages,
        ServicesOffered: p.ServicesOffered,
        IsAvailableForWork: p.IsAvailableForWork,
        AvailabilityNote: p.AvailabilityNote,
        ServiceCategories: p.ServiceCategories.Select(s => new ServiceCategoryResponseDto(s.Id, s.Name, s.IconUrl, s.PriceBandMin, s.PriceBandMax)).ToList(),
        ServiceAreaLatitude: p.ServiceAreaLatitude,
        ServiceAreaLongitude: p.ServiceAreaLongitude,
        ServiceAreaDisplayName: p.ServiceAreaDisplayName,
        ServiceRadiusKm: p.ServiceRadiusKm,
        AddressLine1: p.AddressLine1,
        AddressLine2: p.AddressLine2,
        City: p.City,
        State: p.State,
        PostalCode: p.PostalCode,
        Country: p.Country,
        VerificationStatus: p.VerificationStatus,
        RatingAggregate: p.RatingAggregate,
        TotalReviewCount: p.TotalReviewCount,
        CreatedAt: p.CreatedAt,
        Certifications: p.Certifications.Select(c => new CertificationDto(
            c.Id, c.Type, c.FileUrl, c.OriginalFileName, c.UploadedAt, c.ReviewStatus)).ToList(),
        AuditLogs: p.AuditLogs.OrderByDescending(a => a.Timestamp).Select(a => new AuditLogDto(
            a.Id, a.AdminUserId, a.PreviousStatus, a.NewStatus, a.Timestamp, a.Note)).ToList());
}
