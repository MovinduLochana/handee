using handee.API.DTO;

namespace handee.API.Interfaces;

public interface IProviderAvailabilityService
{
    Task<ProviderOperatingScheduleDto> GetOperatingScheduleAsync(Guid providerId, CancellationToken ct = default);

    Task<ProviderOperatingScheduleDto> UpdateOperatingScheduleAsync(Guid providerId, UpdateOperatingScheduleDto dto, CancellationToken ct = default);

    Task<DailySlotsResponseDto> GetPredefinedSlotsForDateAsync(Guid providerId, DateOnly date, int durationHours = 1, CancellationToken ct = default);
}
