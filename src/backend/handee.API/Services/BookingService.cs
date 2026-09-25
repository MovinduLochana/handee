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
    private readonly IInvoiceService _invoiceService;
    private readonly IBookingNotificationService? _notificationService;

    public BookingService(AppDbContext db) : this(db, new InvoiceService(db), null)
    {
    }

    public BookingService(AppDbContext db, IInvoiceService invoiceService) : this(db, invoiceService, null)
    {
    }

    public BookingService(
        AppDbContext db,
        IInvoiceService invoiceService,
        IBookingNotificationService? notificationService)
    {
        _db = db;
        _invoiceService = invoiceService;
        _notificationService = notificationService;
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
        var booking = await _db.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Provider)
            .Include(b => b.JobRequest)
                .ThenInclude(j => j!.ServiceCategory)
            .Include(b => b.ServiceListing)
                .ThenInclude(l => l!.Category)
            .FirstOrDefaultAsync(b => b.Id == id);

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
            .Include(b => b.Customer)
            .Include(b => b.Provider)
            .Include(b => b.JobRequest)
                .ThenInclude(j => j!.ServiceCategory)
            .Include(b => b.ServiceListing)
                .ThenInclude(l => l!.Category)
            .Where(b => b.CustomerId == customerId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return bookings.Select(ToDto).ToList();
    }

    public async Task<List<BookingResponseDto>> GetForProviderAsync(Guid providerId)
    {
        var bookings = await _db.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Provider)
            .Include(b => b.JobRequest)
                .ThenInclude(j => j!.ServiceCategory)
            .Include(b => b.ServiceListing)
                .ThenInclude(l => l!.Category)
            .Where(b => b.ProviderId == providerId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return bookings.Select(ToDto).ToList();
    }

    public async Task<List<BookingResponseDto>> GetProviderOffersAsync(Guid providerId)
    {
        var bookings = await _db.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Provider)
            .Include(b => b.JobRequest)
                .ThenInclude(j => j!.ServiceCategory)
            .Include(b => b.ServiceListing)
                .ThenInclude(l => l!.Category)
            .Where(b => b.ProviderId == providerId && b.Status == BookingStatus.Requested)
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

        var query = _db.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Provider)
            .Include(b => b.JobRequest)
                .ThenInclude(j => j!.ServiceCategory)
            .Include(b => b.ServiceListing)
                .ThenInclude(l => l!.Category)
            .AsQueryable();

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

        if (_notificationService != null)
        {
            try
            {
                await _notificationService.NotifyBookingStatusChangedAsync(
                    booking.Id,
                    booking.CustomerId,
                    booking.ProviderId,
                    booking.Status,
                    booking.UpdatedAt.Value);
            }
            catch
            {
                // Resilient against notification delivery failures
            }
        }

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

    public async Task<BookingResponseDto> CreateFromListingAsync(
        CreateListingBookingDto dto,
        Guid customerId,
        CancellationToken ct = default)
    {
        var listing = await _db.ServiceListings
            .Include(l => l.Category)
            .Include(l => l.Provider)
            .FirstOrDefaultAsync(l => l.Id == dto.ServiceListingId, ct)
            ?? throw new NotFoundException($"ServiceListing with ID {dto.ServiceListingId} not found.");

        if (!listing.IsActive)
            throw new ValidationException("Cannot book a service listing that is not active.");

        if (listing.ProviderId == customerId)
            throw new ValidationException("Providers cannot book their own service listings.");

        if (dto.ScheduledAt < DateTimeOffset.UtcNow)
            throw new ValidationException("Booking scheduled time must be in the future.");

        var startTime = dto.ScheduledAt.ToUniversalTime();
        var duration = listing.EstimatedDuration > TimeSpan.Zero
            ? listing.EstimatedDuration
            : TimeSpan.FromHours(1);
        var endTime = startTime.Add(duration);

        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? tx = null;
        if (_db.Database.IsRelational())
        {
            tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        }

        try
        {
            // Check provider availability slots if any configured
            var hasSlots = await _db.ProviderAvailabilitySlots
                .AnyAsync(s => s.ProviderId == listing.ProviderId, ct);

            ProviderAvailabilitySlot? matchingSlot = null;
            if (hasSlots)
            {
                matchingSlot = await _db.ProviderAvailabilitySlots
                    .FirstOrDefaultAsync(s => s.ProviderId == listing.ProviderId
                                              && !s.IsBooked
                                              && s.StartTime <= startTime
                                              && s.EndTime >= endTime, ct);

                if (matchingSlot == null)
                {
                    throw new ValidationException("Provider is not available at the requested time slot.");
                }
            }

            // Check for conflicting active bookings
            var hasConflict = await _db.Bookings
                .Include(b => b.ServiceListing)
                .Where(b => b.ProviderId == listing.ProviderId
                            && b.ScheduledAt != null
                            && (b.Status == BookingStatus.Requested
                                || b.Status == BookingStatus.Accepted
                                || b.Status == BookingStatus.InProgress))
                .AnyAsync(b => b.ScheduledAt < endTime &&
                               startTime < b.ScheduledAt.Value.AddMinutes(
                                   b.ServiceListing != null && b.ServiceListing.EstimatedDuration > TimeSpan.Zero
                                       ? b.ServiceListing.EstimatedDuration.TotalMinutes
                                       : 60), ct);

            if (hasConflict)
            {
                throw new ValidationException("Provider already has an active booking during the requested time slot.");
            }

            // If slot matched, mark it as booked
            if (matchingSlot != null)
            {
                matchingSlot.IsBooked = true;
                matchingSlot.UpdatedAt = DateTimeOffset.UtcNow;
            }

            var customer = await _db.Users.FindAsync([customerId], ct);

            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                ServiceListingId = listing.Id,
                ProviderId = listing.ProviderId,
                CustomerId = customerId,
                Status = BookingStatus.Requested,
                ScheduledAt = startTime,
                Notes = dto.Notes,
                CreatedAt = DateTimeOffset.UtcNow,
                ServiceListing = listing,
                Provider = listing.Provider,
                Customer = customer!
            };

            _db.Bookings.Add(booking);
            await _db.SaveChangesAsync(ct);

            // Auto-generate invoice reflecting listing's fixed price and fee breakdown atomically
            await _invoiceService.CreateInvoiceForBookingAsync(
                booking.Id,
                customerId,
                listing.ProviderId,
                listing.FixedPrice,
                QuoteApprovalStatus.AutoApproved,
                listing.Category?.Name ?? listing.Title,
                ct);

            if (tx != null)
            {
                await tx.CommitAsync(ct);
            }

            return ToDto(booking);
        }
        catch (OperationCanceledException)
        {
            if (tx != null) await tx.RollbackAsync(CancellationToken.None);
            throw;
        }
        catch (DbUpdateConcurrencyException)
        {
            if (tx != null) await tx.RollbackAsync(CancellationToken.None);
            throw new ValidationException("Provider already has an active booking during the requested time slot.");
        }
        catch (Exception)
        {
            if (tx != null) await tx.RollbackAsync(CancellationToken.None);
            throw;
        }
        finally
        {
            if (tx != null) await tx.DisposeAsync();
        }

        if (_notificationService != null)
        {
            try
            {
                await _notificationService.NotifyJobDispatchedAsync(
                    listing.ProviderId,
                    booking.Id,
                    null,
                    listing.Category?.Name ?? listing.Title,
                    listing.FixedPrice,
                    ct);
            }
            catch
            {
                // Notification caught to ensure booking persistence resilience
            }
        }

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
        b.UpdatedAt,
        CustomerName: b.Customer?.FullName,
        CustomerPhone: b.Customer?.PhoneNumber,
        ProviderName: b.Provider?.FullName,
        ServiceLocation: b.JobRequest?.Location,
        Price: b.ServiceListing?.FixedPrice ?? b.JobRequest?.BudgetMax ?? b.JobRequest?.BudgetMin ?? 3500m,
        Category: b.JobRequest?.ServiceCategory?.Name ?? b.ServiceListing?.Category?.Name,
        Description: b.JobRequest?.Description ?? b.ServiceListing?.Title ?? b.ServiceListing?.Description,
        Notes: b.Notes);
}
