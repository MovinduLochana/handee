using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IProviderProfileRepository
{
    Task<ProviderProfile?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProviderProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(ProviderProfile profile, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task<(List<ProviderProfile> Items, int TotalCount)> SearchAsync(
        string? searchTerm,
        Guid? skillCategoryId,
        double? lat,
        double? lng,
        double radiusKm,
        int skip,
        int take,
        CancellationToken ct = default);
    Task<Guid?> GetOwnerUserIdAsync(Guid profileId, CancellationToken ct = default);
    
    Task<(List<ProviderProfile> Items, int TotalCount)> GetVerificationQueueAsync(
        VerificationStatus? status,
        string? searchTerm,
        Guid? skillCategoryId,
        int skip,
        int take,
        CancellationToken ct = default);
        
    Task<Dictionary<VerificationStatus, int>> GetVerificationSummaryAsync(CancellationToken ct = default);
}
