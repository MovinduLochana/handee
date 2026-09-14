using handee.API.Data;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Repositories;

public class CertificationRepository(AppDbContext db) : ICertificationRepository
{
    public async Task<Certification?> GetByIdAsync(Guid certificationId, CancellationToken ct = default) =>
        await db.Certifications.FindAsync([certificationId], ct);

    public async Task<List<Certification>> GetForProviderAsync(Guid providerProfileId, CancellationToken ct = default) =>
        await db.Certifications
            .Where(c => c.ProviderProfileId == providerProfileId)
            .OrderByDescending(c => c.UploadedAt)
            .ToListAsync(ct);

    public async Task AddAsync(Certification certification, CancellationToken ct = default) =>
        await db.Certifications.AddAsync(certification, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default) =>
        await db.SaveChangesAsync(ct);
}
