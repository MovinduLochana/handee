namespace handee.API.Hubs;

public interface IBookingClient
{
    Task ReceiveBookingStatusUpdate(Guid bookingId, string status, DateTimeOffset timestamp);
    Task ReceiveNewJobDispatch(Guid bookingId, Guid? jobRequestId, string category, decimal? estimatedPrice);
    Task ReceiveInstantJobOffer(Guid bookingId, Guid jobRequestId, string category, decimal? estimatedPrice, int expiresAtSeconds);
    Task ReceiveScheduledBookingRequest(Guid bookingId, string categoryName, DateTimeOffset scheduledAt, decimal price, int remainingSeconds);
    Task ReceiveDisputeAlert(Guid bookingId, string reason);
}
