using handee.API.DTO;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IBookingService
{
    Task<BookingResponseDto?> GetByIdAsync(Guid id);
    Task<List<BookingResponseDto>> GetForCustomerAsync(Guid customerId);
    Task<List<BookingResponseDto>> GetForProviderAsync(Guid providerId);

    Task<PagedResult<BookingResponseDto>> GetForStaffAsync(
        BookingStatus? status,
        bool sortDescending,
        int page,
        int pageSize);

    Task<BookingResponseDto> UpdateStatusAsync(Guid bookingId, UpdateBookingStatusDto dto);
    Task<BookingResponseDto> UpdateScheduleAsync(Guid bookingId, UpdateBookingScheduleDto dto);
}
