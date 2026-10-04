using handee.API.Entities;
using handee.API.Hubs;
using handee.API.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace handee.API.Services;

public class BookingNotificationService : IBookingNotificationService
{
    private readonly IHubContext<BookingHub, IBookingClient> _hubContext;

    public BookingNotificationService(IHubContext<BookingHub, IBookingClient> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyBookingStatusChangedAsync(
        Guid bookingId,
        Guid customerId,
        Guid providerId,
        BookingStatus newStatus,
        DateTimeOffset timestamp,
        CancellationToken ct = default)
    {
        var statusStr = newStatus.ToString();

        var customerTask = _hubContext.Clients.Group($"Customer_{customerId}")
            .ReceiveBookingStatusUpdate(bookingId, statusStr, timestamp);
        var providerTask = _hubContext.Clients.Group($"Provider_{providerId}")
            .ReceiveBookingStatusUpdate(bookingId, statusStr, timestamp);
        var adminTask = _hubContext.Clients.Group("Admin")
            .ReceiveBookingStatusUpdate(bookingId, statusStr, timestamp);

        await Task.WhenAll(customerTask, providerTask, adminTask);

        if (newStatus == BookingStatus.Disputed)
        {
            var reason = "Booking marked as disputed.";
            var disputeCustomerTask = _hubContext.Clients.Group($"Customer_{customerId}")
                .ReceiveDisputeAlert(bookingId, reason);
            var disputeProviderTask = _hubContext.Clients.Group($"Provider_{providerId}")
                .ReceiveDisputeAlert(bookingId, reason);
            var disputeAdminTask = _hubContext.Clients.Group("Admin")
                .ReceiveDisputeAlert(bookingId, reason);

            await Task.WhenAll(disputeCustomerTask, disputeProviderTask, disputeAdminTask);
        }
    }

    public async Task NotifyJobDispatchedAsync(
        Guid providerId,
        Guid bookingId,
        Guid? jobRequestId,
        string category,
        decimal? estimatedPrice,
        CancellationToken ct = default)
    {
        await _hubContext.Clients.Group($"Provider_{providerId}")
            .ReceiveNewJobDispatch(bookingId, jobRequestId, category, estimatedPrice);
    }

    public async Task NotifyInstantJobDispatchedAsync(
        Guid providerId,
        Guid bookingId,
        Guid jobRequestId,
        string category,
        decimal? estimatedPrice,
        int expiresAtSeconds,
        CancellationToken ct = default)
    {
        await _hubContext.Clients.Group($"Provider_{providerId}")
            .ReceiveInstantJobOffer(bookingId, jobRequestId, category, estimatedPrice, expiresAtSeconds);
    }

    public async Task NotifyScheduledBookingRequestedAsync(
        Guid providerId,
        Guid bookingId,
        string categoryName,
        DateTimeOffset scheduledAt,
        decimal price,
        int remainingSeconds,
        CancellationToken ct = default)
    {
        await _hubContext.Clients.Group($"Provider_{providerId}")
            .ReceiveScheduledBookingRequest(bookingId, categoryName, scheduledAt, price, remainingSeconds);
    }
}
