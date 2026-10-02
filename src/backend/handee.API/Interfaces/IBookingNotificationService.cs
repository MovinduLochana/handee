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

    Task NotifyInstantJobDispatchedAsync(
        Guid providerId,
        Guid bookingId,
        Guid jobRequestId,
        string category,
        decimal? estimatedPrice,
        int expiresAtSeconds,
        CancellationToken ct = default);

    Task NotifyScheduledBookingRequestedAsync(
        Guid providerId,
        Guid bookingId,
        string categoryName,
        DateTimeOffset scheduledAt,
        decimal price,
        int remainingSeconds,
        CancellationToken ct = default);
}
