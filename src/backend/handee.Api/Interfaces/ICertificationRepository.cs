using handee.API.Entities;

namespace handee.API.Interfaces;

public interface ICertificationRepository
{
    Task<Certification?> GetByIdAsync(Guid certificationId, CancellationToken ct = default);
    Task<List<Certification>> GetForProviderAsync(Guid providerProfileId, CancellationToken ct = default);
    Task AddAsync(Certification certification, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
