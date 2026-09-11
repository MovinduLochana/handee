using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IProviderProfileRepository
{
    Task<ProviderProfile?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProviderProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(ProviderProfile profile, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task<List<ProviderProfile>> SearchAsync(
        Guid? skillCategoryId,
        double? lat,
        double? lng,
        double radiusKm,
        CancellationToken ct = default);
    Task<Guid?> GetOwnerUserIdAsync(Guid profileId, CancellationToken ct = default);
}
