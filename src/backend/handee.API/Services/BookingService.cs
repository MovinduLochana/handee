using Microsoft.EntityFrameworkCore;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Services;

public class BookingService : IBookingService
{
    private readonly AppDbContext _db;

    public BookingService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Booking status state machine.
    ///
    ///   Requested  -> Accepted    (provider only)
    ///   Accepted   -> InProgress  (provider only)
    ///   InProgress -> Completed   (provider only)
    ///   Requested/Accepted/InProgress/Completed -> Disputed (customer or provider)
    ///   Disputed   -> anything    (admin only)
    ///
    /// Legality (which target states a given source state may reach at all)
    /// is a hard rule that applies to everyone, including admins — an admin
    /// cannot jump Requested straight to Completed either. "Who may perform
    /// an otherwise-legal transition" is a separate, looser rule layered on
    /// top, and admins bypass only that layer.
    /// </summary>
    private static readonly Dictionary<BookingStatus, BookingStatus[]> LegalTransitions = new()
    {
        [BookingStatus.Requested] = [BookingStatus.Accepted, BookingStatus.Disputed],
        [BookingStatus.Accepted] = [BookingStatus.InProgress, BookingStatus.Disputed],
        [BookingStatus.InProgress] = [BookingStatus.Completed, BookingStatus.Disputed],
        [BookingStatus.Completed] = [BookingStatus.Disputed],
        [BookingStatus.Disputed] =
        [
            BookingStatus.Requested, BookingStatus.Accepted,
            BookingStatus.InProgress, BookingStatus.Completed
        ],
    };

    private enum RequiredParty { ProviderOnly, CustomerOrProvider }

    // Deliberately has no entries for transitions out of Disputed — those are
    // special-cased to admin-only in UpdateStatusAsync, since "admin only"
    // doesn't fit the two shapes below.
    private static readonly Dictionary<(BookingStatus From, BookingStatus To), RequiredParty> TransitionAuthorization = new()
    {
        [(BookingStatus.Requested, BookingStatus.Accepted)] = RequiredParty.ProviderOnly,
        [(BookingStatus.Accepted, BookingStatus.InProgress)] = RequiredParty.ProviderOnly,
        [(BookingStatus.InProgress, BookingStatus.Completed)] = RequiredParty.ProviderOnly,
        [(BookingStatus.Requested, BookingStatus.Disputed)] = RequiredParty.CustomerOrProvider,
        [(BookingStatus.Accepted, BookingStatus.Disputed)] = RequiredParty.CustomerOrProvider,
        [(BookingStatus.InProgress, BookingStatus.Disputed)] = RequiredParty.CustomerOrProvider,
        [(BookingStatus.Completed, BookingStatus.Disputed)] = RequiredParty.CustomerOrProvider,
    };

    private static readonly BookingStatus[] ReschedulableStatuses =
        [BookingStatus.Requested, BookingStatus.Accepted];

    public async Task<BookingResponseDto?> GetByIdAsync(Guid id, Guid requestingUserId, bool isRequesterAdmin)
    {
        var booking = await _db.Bookings.FindAsync(id);
        if (booking is null)
            return null;

        var isParty = booking.CustomerId == requestingUserId || booking.ProviderId == requestingUserId;
        if (!isRequesterAdmin && !isParty)
            return null;

        return ToDto(booking);
    }

    public async Task<List<BookingResponseDto>> GetForCustomerAsync(Guid customerId)
    {
        var bookings = await _db.Bookings
            .Where(b => b.CustomerId == customerId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return bookings.Select(ToDto).ToList();
    }

    public async Task<List<BookingResponseDto>> GetForProviderAsync(Guid providerId)
    {
        var bookings = await _db.Bookings
            .Where(b => b.ProviderId == providerId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return bookings.Select(ToDto).ToList();
    }

    public async Task<PagedResult<BookingResponseDto>> GetForStaffAsync(
        BookingStatus? status,
        bool sortDescending,
        int page,
        int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Bookings.AsQueryable();

        if (status is not null)
            query = query.Where(b => b.Status == status);

        var totalCount = await query.CountAsync();

        query = sortDescending
            ? query.OrderByDescending(b => b.CreatedAt)
            : query.OrderBy(b => b.CreatedAt);

        var pageItems = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<BookingResponseDto>(
            pageItems.Select(ToDto).ToList(),
            totalCount,
            page,
            pageSize);
    }

    public async Task<BookingResponseDto> UpdateStatusAsync(
        Guid bookingId, UpdateBookingStatusDto dto, Guid requestingUserId, bool isRequesterAdmin)
    {
        var booking = await _db.Bookings.FindAsync(bookingId)
            ?? throw new NotFoundException("Booking not found.");

        var isCustomer = booking.CustomerId == requestingUserId;
        var isProvider = booking.ProviderId == requestingUserId;

        // Total stranger: same non-disclosure principle as GetByIdAsync.
        if (!isRequesterAdmin && !isCustomer && !isProvider)
            throw new NotFoundException("Booking not found.");

        var from = booking.Status;
        var to = dto.Status;

        // Legality first, for everyone, admins included — see the class
        // summary above the state tables.
        if (!LegalTransitions.TryGetValue(from, out var allowedTargets) || !allowedTargets.Contains(to))
            throw new ValidationException($"Cannot transition booking from '{from}' to '{to}'.");

        if (!isRequesterAdmin)
        {
            if (from == BookingStatus.Disputed)
                throw new ForbiddenException("Only an admin may change the status of a disputed booking.");

            if (!TransitionAuthorization.TryGetValue((from, to), out var requiredParty))
                throw new ForbiddenException("This status change is not permitted.");

            var authorized = requiredParty switch
            {
                RequiredParty.ProviderOnly => isProvider,
                RequiredParty.CustomerOrProvider => isCustomer || isProvider,
                _ => false
            };

            if (!authorized)
                throw new ForbiddenException("You are not permitted to make this status change.");
        }

        booking.Status = to;
        booking.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();

        return ToDto(booking);
    }

    public async Task<BookingResponseDto> UpdateScheduleAsync(
        Guid bookingId, UpdateBookingScheduleDto dto, Guid requestingUserId, bool isRequesterAdmin)
    {
        var booking = await _db.Bookings.FindAsync(bookingId)
            ?? throw new NotFoundException("Booking not found.");

        var isCustomer = booking.CustomerId == requestingUserId;
        var isProvider = booking.ProviderId == requestingUserId;

        // Total stranger: same non-disclosure principle as GetByIdAsync.
        if (!isRequesterAdmin && !isCustomer && !isProvider)
            throw new NotFoundException("Booking not found.");

        // A real party, just not right now: this is a state problem, not an
        // identity problem, so it's a 400 rather than a 403.
        if (!isRequesterAdmin && !ReschedulableStatuses.Contains(booking.Status))
            throw new ValidationException(
                $"Booking cannot be rescheduled while its status is '{booking.Status}'.");

        booking.ScheduledAt = dto.ScheduledAt;
        booking.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();

        return ToDto(booking);
    }

    private static BookingResponseDto ToDto(Booking b) => new(
        b.Id,
        b.JobRequestId,
        b.ServiceListingId,
        b.ProviderId,
        b.CustomerId,
        b.Status.ToString(),
        b.ScheduledAt,
        b.CreatedAt,
        b.UpdatedAt);
}
