using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IBookingNotificationService
{
    Task NotifyBookingStatusChangedAsync(
        Guid bookingId,
        Guid customerId,
        Guid providerId,
        BookingStatus newStatus,
        DateTimeOffset timestamp,
        CancellationToken ct = default);

    Task NotifyJobDispatchedAsync(
        Guid providerId,
        Guid bookingId,
        Guid? jobRequestId,
        string category,
        decimal? estimatedPrice,
        CancellationToken ct = default);
}
