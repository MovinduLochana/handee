using handee.API.DTO;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IAdminService
{
    Task<IList<AdminUserResult>> GetUsersAsync();
    Task SetUserStatusAsync(Guid userId, bool isActive);
    Task SetVerificationStatusAsync(Guid userId, ProviderVerificationStatus status);
    Task ReviewCertificationAsync(Guid certificationId, Guid adminUserId, DocumentReviewStatus status, CancellationToken ct = default);
    Task<PagedResult<handee.API.DTO.Provider.ProviderProfileAdminDto>> GetVerificationQueueAsync(VerificationStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task<Dictionary<string, int>> GetVerificationSummaryAsync(CancellationToken ct = default);
}
