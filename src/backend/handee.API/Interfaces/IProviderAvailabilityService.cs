using handee.API.DTO;

namespace handee.API.Interfaces;

public interface IProviderAvailabilityService
{
    Task<SlotResponseDto> CreateSlotAsync(Guid providerId, CreateSlotDto dto);

    Task<List<SlotResponseDto>> CreateBatchSlotsAsync(Guid providerId, BatchCreateSlotsDto dto);

    Task<List<SlotResponseDto>> CreateRecurringSlotsAsync(Guid providerId, RecurringScheduleDto dto);

    /// <summary>Only future unbooked non-conflicting slots — this is the "can I book this provider"
    /// view for other users, not the provider's own dashboard.</summary>
    Task<List<SlotResponseDto>> GetForProviderAsync(Guid providerId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null);

    /// <summary>All of the calling provider's own slots, booked or not.</summary>
    Task<List<SlotResponseDto>> GetOwnAsync(Guid providerId);

    Task DeleteSlotAsync(Guid slotId, Guid requestingProviderId);
}
