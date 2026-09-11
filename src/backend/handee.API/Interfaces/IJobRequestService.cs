using handee.API.DTO;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IJobRequestService
{
    Task<JobRequestResponseDto> CreateAsync(Guid customerId, CreateJobRequestDto dto);

    /// <summary>Returns null both when the request doesn't exist and when the
    /// requester isn't a party to it (deliberately indistinguishable, so a
    /// non-party caller can't tell the difference).</summary>
    Task<JobRequestResponseDto?> GetByIdAsync(Guid id, Guid requestingUserId, bool isRequesterAdmin);

    Task<List<JobRequestResponseDto>> GetForCustomerAsync(Guid customerId);

    Task<PagedResult<JobRequestResponseDto>> GetForStaffAsync(
        JobRequestStatus? status,
        JobUrgency? urgency,
        bool sortDescending,
        int page,
        int pageSize);
}
