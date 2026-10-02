namespace handee.API.Interfaces;

public interface IBookingExpirationService
{
    Task<int> ProcessExpiredBookingsAsync(CancellationToken ct = default);
}
