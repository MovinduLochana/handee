using handee.API.Data;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Repositories;

public class ProviderProfileRepository(AppDbContext db) : IProviderProfileRepository
{
    public async Task<ProviderProfile?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await db.ProviderProfiles
            .Include(p => p.ServiceCategories)
            .Include(p => p.Certifications)
            .Include(p => p.AuditLogs)
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<ProviderProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        await db.ProviderProfiles
            .Include(p => p.ServiceCategories)
            .Include(p => p.Certifications)
            .Include(p => p.AuditLogs)
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

    public async Task AddAsync(ProviderProfile profile, CancellationToken ct = default) =>
        await db.ProviderProfiles.AddAsync(profile, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default) =>
        await db.SaveChangesAsync(ct);

    public async Task<Guid?> GetOwnerUserIdAsync(Guid profileId, CancellationToken ct = default) =>
        await db.ProviderProfiles
            .Where(p => p.Id == profileId)
            .Select(p => (Guid?)p.UserId)
            .FirstOrDefaultAsync(ct);

    public async Task<(List<ProviderProfile> Items, int TotalCount)> SearchAsync(
        string? searchTerm,
        Guid? skillCategoryId,
        double? lat,
        double? lng,
        double radiusKm,
        int skip,
        int take,
        CancellationToken ct = default)
    {
        var query = db.ProviderProfiles
            .Include(p => p.ServiceCategories)
            .Include(p => p.User)
            .Where(p => p.VerificationStatus == VerificationStatus.Verified
                        && p.IsAvailableForWork)
            .AsQueryable();

        if (skillCategoryId.HasValue)
            query = query.Where(p => p.ServiceCategories.Any(s => s.Id == skillCategoryId.Value));

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.ToLower();
            query = query.Where(p => (p.User.FullName != null && p.User.FullName.ToLower().Contains(term)) ||
                                     (p.User.Email != null && p.User.Email.ToLower().Contains(term)));
        }

        if (lat.HasValue && lng.HasValue)
        {
            double latDelta = radiusKm / 111.0;
            double lngDelta = radiusKm / (111.0 * Math.Cos(lat.Value * Math.PI / 180.0));

            query = query.Where(p =>
                p.ServiceAreaLatitude != null && p.ServiceAreaLongitude != null &&
                p.ServiceAreaLatitude >= lat - latDelta &&
                p.ServiceAreaLatitude <= lat + latDelta &&
                p.ServiceAreaLongitude >= lng - lngDelta &&
                p.ServiceAreaLongitude <= lng + lngDelta);
        }

        var totalCount = await query.CountAsync(ct);
        var items = await query.Skip(skip).Take(take).ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<(List<ProviderProfile> Items, int TotalCount)> GetVerificationQueueAsync(
        VerificationStatus? status,
        string? searchTerm,
        Guid? skillCategoryId,
        int skip,
        int take,
        CancellationToken ct = default)
    {
        var query = db.ProviderProfiles
            .Include(p => p.ServiceCategories)
            .Include(p => p.User)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(p => p.VerificationStatus == status.Value);
        }

        if (skillCategoryId.HasValue)
            query = query.Where(p => p.ServiceCategories.Any(s => s.Id == skillCategoryId.Value));

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.ToLower();
            query = query.Where(p => (p.User.FullName != null && p.User.FullName.ToLower().Contains(term)) ||
                                     (p.User.Email != null && p.User.Email.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(ct);
        var items = await query.OrderByDescending(p => p.CreatedAt).Skip(skip).Take(take).ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<Dictionary<VerificationStatus, int>> GetVerificationSummaryAsync(CancellationToken ct = default)
    {
        var grouped = await db.ProviderProfiles
            .GroupBy(p => p.VerificationStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var result = new Dictionary<VerificationStatus, int>
        {
            { VerificationStatus.Pending, 0 },
            { VerificationStatus.InReview, 0 },
            { VerificationStatus.Verified, 0 },
            { VerificationStatus.Rejected, 0 }
        };

        foreach (var item in grouped)
        {
            result[item.Status] = item.Count;
        }

        return result;
    }
}
