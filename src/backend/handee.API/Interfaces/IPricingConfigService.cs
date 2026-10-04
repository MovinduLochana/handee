using handee.API.DTO;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IPricingConfigService
{
    Task<UrgencyMultiplierConfigDto> GetUrgencyMultipliersAsync(CancellationToken ct = default);
    Task<UrgencyMultiplierConfigDto> UpdateUrgencyMultipliersAsync(UrgencyMultiplierConfigDto dto, CancellationToken ct = default);
    double GetMultiplierForUrgency(JobUrgency urgency, UrgencyMultiplierConfigDto config);
}
