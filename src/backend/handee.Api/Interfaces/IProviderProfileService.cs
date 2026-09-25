using handee.API.DTO;
using handee.API.DTO.Provider;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IProviderProfileService
{
    Task<object?> GetProfileAsync(Guid id, string callerRole, CancellationToken ct = default);
    Task<ProviderProfileProviderDto> GetProfileByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task UpdateProfileAsync(Guid id, UpdateProviderProfileDto dto, CancellationToken ct = default);
    Task<Certification> UploadDocumentAsync(Guid profileId, DocumentUploadDto dto, CancellationToken ct = default);
    Task<ProviderProfile> CreateProfileAsync(Guid userId, CancellationToken ct = default);
    Task<Guid?> GetOwnerUserIdAsync(Guid profileId, CancellationToken ct = default);
    Task<PagedResult<ProviderProfileCustomerDto>> SearchAsync(
        string? searchTerm, Guid? serviceCategoryId, double? lat, double? lng, double radiusKm,
        int skip, int take, CancellationToken ct = default);
}
