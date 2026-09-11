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

    public async Task<BookingResponseDto?> GetByIdAsync(Guid id)
    {
        var booking = await _db.Bookings.FindAsync(id);
        return booking is null ? null : ToDto(booking);
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

    public async Task<BookingResponseDto> UpdateStatusAsync(Guid bookingId, UpdateBookingStatusDto dto)
    {
        var booking = await _db.Bookings.FindAsync(bookingId)
            ?? throw new NotFoundException("Booking not found.");

        booking.Status = dto.Status;
        booking.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();

        return ToDto(booking);
    }

    public async Task<BookingResponseDto> UpdateScheduleAsync(Guid bookingId, UpdateBookingScheduleDto dto)
    {
        var booking = await _db.Bookings.FindAsync(bookingId)
            ?? throw new NotFoundException("Booking not found.");

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
