using handee.API.DTO.Provider;

namespace handee.API.Interfaces;

public interface IProviderTrustService
{
    Task<TrustSignalDto> GetProviderTrustSignals(Guid providerId, CancellationToken ct = default);
    Task InvalidateCacheAsync(Guid providerId, CancellationToken ct = default);
}
