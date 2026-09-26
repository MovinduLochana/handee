using Microsoft.EntityFrameworkCore;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Services;

public class ProviderAvailabilityService : IProviderAvailabilityService
{
    private readonly AppDbContext _db;

    public ProviderAvailabilityService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<SlotResponseDto> CreateSlotAsync(Guid providerId, CreateSlotDto dto)
    {
        if (dto.EndTime <= dto.StartTime)
            throw new ValidationException("EndTime must be after StartTime.");

        // Checked against all of the provider's existing slots, booked or
        // not — a booked slot still represents committed time and can't be
        // double-offered.
        var startTimeUtc = dto.StartTime.ToUniversalTime();
        var endTimeUtc = dto.EndTime.ToUniversalTime();

        var overlaps = await _db.ProviderAvailabilitySlots.AnyAsync(s =>
            s.ProviderId == providerId &&
            s.StartTime < endTimeUtc &&
            startTimeUtc < s.EndTime);

        if (overlaps)
            throw new ValidationException("This slot overlaps with an existing availability slot.");

        var slot = new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = startTimeUtc,
            EndTime = endTimeUtc
        };

        _db.ProviderAvailabilitySlots.Add(slot);
        await _db.SaveChangesAsync();

        return ToDto(slot);
    }

    public async Task<List<SlotResponseDto>> CreateBatchSlotsAsync(Guid providerId, BatchCreateSlotsDto dto)
    {
        if (dto.Slots == null || dto.Slots.Count == 0)
            throw new ValidationException("At least one slot must be provided.");

        // 1. Validate each slot internally and convert to UTC for PostgreSQL compatibility
        var utcSlots = dto.Slots.Select(s => new CreateSlotDto
        {
            StartTime = s.StartTime.ToUniversalTime(),
            EndTime = s.EndTime.ToUniversalTime()
        }).ToList();

        foreach (var s in utcSlots)
        {
            if (s.EndTime <= s.StartTime)
                throw new ValidationException("EndTime must be after StartTime.");
        }

        // 2. Validate internal overlaps among requested slots
        var sorted = utcSlots.OrderBy(s => s.StartTime).ToList();
        for (int i = 0; i < sorted.Count - 1; i++)
        {
            if (sorted[i].EndTime > sorted[i + 1].StartTime)
                throw new ValidationException("Batch contains internally overlapping slots.");
        }

        // 3. Validate against existing slots for provider
        var minStart = sorted.First().StartTime;
        var maxEnd = sorted.Last().EndTime;

        var existingSlots = await _db.ProviderAvailabilitySlots
            .Where(s => s.ProviderId == providerId && s.StartTime < maxEnd && minStart < s.EndTime)
            .ToListAsync();

        foreach (var candidate in sorted)
        {
            if (existingSlots.Any(e => e.StartTime < candidate.EndTime && candidate.StartTime < e.EndTime))
                throw new ValidationException("One or more slots overlap with an existing availability slot.");
        }

        var newEntities = sorted.Select(s => new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = s.StartTime,
            EndTime = s.EndTime
        }).ToList();

        _db.ProviderAvailabilitySlots.AddRange(newEntities);
        await _db.SaveChangesAsync();

        return newEntities.Select(ToDto).ToList();
    }

    public async Task<List<SlotResponseDto>> CreateRecurringSlotsAsync(Guid providerId, RecurringScheduleDto dto)
    {
        if (dto.DailyEndTime <= dto.DailyStartTime)
            throw new ValidationException("DailyEndTime must be after DailyStartTime.");

        if (dto.EndDate <= dto.StartDate)
            throw new ValidationException("EndDate must be after StartDate.");

        if (dto.SlotDurationMinutes <= 0)
            throw new ValidationException("SlotDurationMinutes must be positive.");

        if (dto.DaysOfWeek == null || dto.DaysOfWeek.Count == 0)
            throw new ValidationException("At least one day of the week must be selected.");

        var generatedSlots = new List<CreateSlotDto>();
        var span = TimeSpan.FromMinutes(dto.SlotDurationMinutes);

        var offset = dto.TimeZoneOffsetMinutes.HasValue
            ? TimeSpan.FromMinutes(dto.TimeZoneOffsetMinutes.Value)
            : dto.StartDate.Offset;

        // Iterate day-by-day relative to the provider's local calendar
        var startDateLocal = dto.StartDate.ToOffset(offset);
        var endDateLocal = dto.EndDate.ToOffset(offset);

        var currentDay = startDateLocal.Date;
        var lastDay = endDateLocal.Date;

        while (currentDay <= lastDay)
        {
            if (dto.DaysOfWeek.Contains(currentDay.DayOfWeek))
            {
                var slotStart = currentDay.Add(dto.DailyStartTime);
                var dayEnd = currentDay.Add(dto.DailyEndTime);

                while (slotStart.Add(span) <= dayEnd)
                {
                    generatedSlots.Add(new CreateSlotDto
                    {
                        StartTime = new DateTimeOffset(slotStart, offset).ToUniversalTime(),
                        EndTime = new DateTimeOffset(slotStart.Add(span), offset).ToUniversalTime()
                    });

                    slotStart = slotStart.Add(span);
                }
            }

            currentDay = currentDay.AddDays(1);
        }

        if (generatedSlots.Count == 0)
            throw new ValidationException("No slots could be generated with the given schedule parameters.");

        return await CreateBatchSlotsAsync(providerId, new BatchCreateSlotsDto { Slots = generatedSlots });
    }

    public async Task<List<SlotResponseDto>> GetForProviderAsync(Guid providerId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null)
    {
        var now = DateTimeOffset.UtcNow;
        var query = _db.ProviderAvailabilitySlots
            .Where(s => s.ProviderId == providerId && !s.IsBooked && s.StartTime >= now);

        if (startDate.HasValue)
            query = query.Where(s => s.StartTime >= startDate.Value.ToUniversalTime());

        if (endDate.HasValue)
            query = query.Where(s => s.EndTime <= endDate.Value.ToUniversalTime());

        var slots = await query.OrderBy(s => s.StartTime).ToListAsync();

        // Also check if any active booking conflicts with the slots
        var activeStatuses = new List<BookingStatus>
        {
            BookingStatus.Requested,
            BookingStatus.Accepted,
            BookingStatus.InProgress
        };

        var activeBookings = await _db.Bookings
            .Include(b => b.ServiceListing)
            .Where(b => b.ProviderId == providerId && activeStatuses.Contains(b.Status) && b.ScheduledAt.HasValue && b.ScheduledAt.Value >= now.AddHours(-12))
            .Select(b => new
            {
                Start = b.ScheduledAt!.Value,
                End = b.ScheduledAt!.Value.AddMinutes(
                    b.ServiceListing != null && b.ServiceListing.EstimatedDuration > TimeSpan.Zero
                        ? b.ServiceListing.EstimatedDuration.TotalMinutes
                        : 60)
            })
            .ToListAsync();

        var freeSlots = slots.Where(s =>
            !activeBookings.Any(b => b.Start < s.EndTime && s.StartTime < b.End)
        ).ToList();

        return freeSlots.Select(ToDto).ToList();
    }

    public async Task<List<SlotResponseDto>> GetOwnAsync(Guid providerId)
    {
        var slots = await _db.ProviderAvailabilitySlots
            .Where(s => s.ProviderId == providerId)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        return slots.Select(ToDto).ToList();
    }

    public async Task DeleteSlotAsync(Guid slotId, Guid requestingProviderId)
    {
        var slot = await _db.ProviderAvailabilitySlots.FindAsync(slotId);

        // Not found, or exists but belongs to someone else: same
        // non-disclosure principle as BookingService's ownership checks —
        // don't reveal that a slot exists to someone who doesn't own it.
        if (slot is null || slot.ProviderId != requestingProviderId)
            throw new NotFoundException("Availability slot not found.");

        // A real owner, just not allowed to do this right now — a state
        // problem, not an identity problem, same reasoning as
        // BookingService's reschedule-wrong-status rejection.
        if (slot.IsBooked)
            throw new ValidationException("Cannot delete a slot that has already been booked.");

        _db.ProviderAvailabilitySlots.Remove(slot);
        await _db.SaveChangesAsync();
    }

    private static SlotResponseDto ToDto(ProviderAvailabilitySlot s) => new(
        s.Id,
        s.ProviderId,
        s.StartTime,
        s.EndTime,
        s.IsBooked,
        s.CreatedAt,
        s.UpdatedAt);
}
