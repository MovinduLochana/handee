namespace handee.API.Hubs;

public interface IBookingClient
{
    Task ReceiveBookingStatusUpdate(Guid bookingId, string status, DateTimeOffset timestamp);
    Task ReceiveNewJobDispatch(Guid bookingId, Guid? jobRequestId, string category, decimal? estimatedPrice);
    Task ReceiveDisputeAlert(Guid bookingId, string reason);
}
