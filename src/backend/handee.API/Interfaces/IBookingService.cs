using handee.API.DTO;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IBookingService
{
    /// <summary>Returns null both when the booking doesn't exist and when the
    /// requester isn't a party to it (deliberately indistinguishable, so a
    /// non-party caller can't tell the difference).</summary>
    Task<BookingResponseDto?> GetByIdAsync(Guid id, Guid requestingUserId, bool isRequesterAdmin);

    Task<List<BookingResponseDto>> GetForCustomerAsync(Guid customerId);
    Task<List<BookingResponseDto>> GetForProviderAsync(Guid providerId);
    Task<List<BookingResponseDto>> GetProviderOffersAsync(Guid providerId);
    Task<List<BookingResponseDto>> GetProviderInstantOffersAsync(Guid providerId, CancellationToken ct = default);
    Task<List<BookingResponseDto>> GetProviderScheduledRequestsAsync(Guid providerId, CancellationToken ct = default);

    Task<PagedResult<BookingResponseDto>> GetForStaffAsync(
        BookingStatus? status,
        bool sortDescending,
        int page,
        int pageSize);

    Task<BookingResponseDto> UpdateStatusAsync(
        Guid bookingId, UpdateBookingStatusDto dto, Guid requestingUserId, bool isRequesterAdmin);

    Task<BookingResponseDto> UpdateScheduleAsync(
        Guid bookingId, UpdateBookingScheduleDto dto, Guid requestingUserId, bool isRequesterAdmin);

    Task<BookingResponseDto> CreateFromListingAsync(
        CreateListingBookingDto dto, Guid customerId, CancellationToken ct = default);

    Task<BookingResponseDto> DeclineBookingAsync(
        Guid bookingId, Guid providerId, string? reason = null, CancellationToken ct = default);
}
