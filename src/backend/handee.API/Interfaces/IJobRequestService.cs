using handee.API.DTO;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IJobRequestService
{
    Task<JobRequestResponseDto> CreateAsync(Guid customerId, CreateJobRequestDto dto);
    Task<JobRequestResponseDto?> GetByIdAsync(Guid id);
    Task<List<JobRequestResponseDto>> GetForCustomerAsync(Guid customerId);

    Task<PagedResult<JobRequestResponseDto>> GetForStaffAsync(
        JobRequestStatus? status,
        JobUrgency? urgency,
        bool sortDescending,
        int page,
        int pageSize);
}
