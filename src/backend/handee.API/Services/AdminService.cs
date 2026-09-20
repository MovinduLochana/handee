using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using handee.API.Data;

namespace handee.API.Services;

public class AdminService : IAdminService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ICertificationRepository _certRepo;
    private readonly IProviderProfileRepository _providerRepo;
    private readonly AppDbContext _db;

    public AdminService(
        UserManager<ApplicationUser> userManager, 
        ICertificationRepository certRepo,
        IProviderProfileRepository providerRepo,
        AppDbContext db)
    {
        _userManager = userManager;
        _certRepo = certRepo;
        _providerRepo = providerRepo;
        _db = db;
    }

    public async Task<IList<AdminUserResult>> GetUsersAsync()
    {
        var users = await _userManager.Users.ToListAsync();

        var result = new List<AdminUserResult>(users.Count);

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(new AdminUserResult(
                user.Id,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                user.IsActive,
                user.ProviderVerificationStatus.ToString(),
                user.CreatedAt,
                roles
            ));
        }

        return result;
    }

    public async Task SetUserStatusAsync(Guid userId, bool isActive)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("User not found.");

        user.IsActive = isActive;

        await _userManager.UpdateAsync(user);
    }

    public async Task SetVerificationStatusAsync(Guid userId, ProviderVerificationStatus status)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("User not found.");

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains("Provider"))
            throw new ValidationException(
                "Verification status is only applicable to Provider-role users.");

        user.ProviderVerificationStatus = status;

        await _userManager.UpdateAsync(user);
    }

    public async Task ReviewCertificationAsync(
        Guid certificationId, Guid adminUserId, DocumentReviewStatus status, CancellationToken ct = default)
    {
        var cert = await _certRepo.GetByIdAsync(certificationId, ct)
            ?? throw new NotFoundException($"Certification {certificationId} not found.");

        cert.ReviewStatus = status;

        var profile = await _providerRepo.GetByIdAsync(cert.ProviderProfileId, ct);
        if (profile != null) 
        {
            var log = new VerificationAuditLog
            {
                Id = Guid.NewGuid(),
                ProviderProfileId = profile.Id,
                AdminUserId = adminUserId,
                PreviousStatus = profile.VerificationStatus,
                NewStatus = profile.VerificationStatus,
                Timestamp = DateTimeOffset.UtcNow,
                Note = $"Document {cert.Type} ({cert.OriginalFileName ?? cert.FileUrl}) review status set to {status}."
            };
            _db.VerificationAuditLogs.Add(log);
        }

        await _certRepo.SaveChangesAsync(ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<handee.API.DTO.Provider.ProviderProfileAdminDto>> GetVerificationQueueAsync(
        VerificationStatus? status, string? searchTerm, Guid? skillCategoryId, int page, int pageSize, CancellationToken ct = default)
    {
        var normalizedPage = Math.Max(page, 1);
        var normalizedPageSize = Math.Clamp(pageSize, 1, 100);
        var skip = (normalizedPage - 1) * normalizedPageSize;

        var (items, totalCount) = await _providerRepo.GetVerificationQueueAsync(status, searchTerm, skillCategoryId, skip, normalizedPageSize, ct);

        var dtos = items.Select(ProviderProfileService.MapToAdminDto).ToList();

        return new PagedResult<handee.API.DTO.Provider.ProviderProfileAdminDto>(
            dtos, totalCount, normalizedPage, normalizedPageSize);
    }

    public async Task<Dictionary<string, int>> GetVerificationSummaryAsync(CancellationToken ct = default)
    {
        var summary = await _providerRepo.GetVerificationSummaryAsync(ct);
        return summary.ToDictionary(kvp => kvp.Key.ToString(), kvp => kvp.Value);
    }
}
