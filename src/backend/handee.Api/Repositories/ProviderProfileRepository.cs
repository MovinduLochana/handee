using handee.API.Data;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Repositories;

public class ProviderProfileRepository(AppDbContext db) : IProviderProfileRepository
{
    public async Task<ProviderProfile?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await db.ProviderProfiles
            .Include(p => p.SkillCategories)
            .Include(p => p.Certifications)
            .Include(p => p.AuditLogs)
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<ProviderProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        await db.ProviderProfiles
            .Include(p => p.SkillCategories)
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

    public async Task<List<ProviderProfile>> SearchAsync(
        Guid? skillCategoryId,
        double? lat,
        double? lng,
        double radiusKm,
        CancellationToken ct = default)
    {
        var query = db.ProviderProfiles
            .Include(p => p.SkillCategories)
            .Include(p => p.User)
            .Where(p => p.VerificationStatus == VerificationStatus.Verified
                        && p.IsAvailableForWork)
            .AsQueryable();

        if (skillCategoryId.HasValue)
            query = query.Where(p => p.SkillCategories.Any(s => s.Id == skillCategoryId.Value));

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

        return await query.ToListAsync(ct);
    }
}
