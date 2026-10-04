using handee.API.Data;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace handee.API.Services;

public class BookingExpirationService : IBookingExpirationService
{
    private readonly AppDbContext _db;
    private readonly IBookingNotificationService _notificationService;
    private readonly IAgentWorkflowService _agentWorkflowService;
    private readonly ILogger<BookingExpirationService> _logger;

    public BookingExpirationService(
        AppDbContext db,
        IBookingNotificationService notificationService,
        IAgentWorkflowService agentWorkflowService,
        ILogger<BookingExpirationService>? logger = null)
    {
        _db = db;
        _notificationService = notificationService;
        _agentWorkflowService = agentWorkflowService;
        _logger = logger ?? NullLogger<BookingExpirationService>.Instance;
    }

    public async Task<int> ProcessExpiredBookingsAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var expiredBookings = await _db.Bookings
            .Where(b => b.Status == BookingStatus.Requested && b.ExpiresAt != null && b.ExpiresAt <= now)
            .ToListAsync(ct);

        if (expiredBookings.Count == 0) return 0;

        foreach (var booking in expiredBookings)
        {
            booking.Status = BookingStatus.Expired;
            booking.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(ct);

        foreach (var booking in expiredBookings)
        {
            try
            {
                await _notificationService.NotifyBookingStatusChangedAsync(
                    booking.Id,
                    booking.CustomerId,
                    booking.ProviderId,
                    BookingStatus.Expired,
                    booking.UpdatedAt!.Value,
                    ct);

                if (booking.BookingType == BookingType.InstantMatch)
                {
                    await _agentWorkflowService.RedispatchInstantMatchAsync(booking.Id, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error finalizing expiration for booking {BookingId}", booking.Id);
            }
        }

        return expiredBookings.Count;
    }
}
