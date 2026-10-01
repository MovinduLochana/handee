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

    public async Task<ProviderOperatingScheduleDto> GetOperatingScheduleAsync(Guid providerId, CancellationToken ct = default)
    {
        var existing = await _db.ProviderOperatingSchedules
            .Where(s => s.ProviderId == providerId)
            .ToListAsync(ct);

        if (existing.Count == 0)
        {
            return new ProviderOperatingScheduleDto(providerId, GetDefaultWeeklySchedule());
        }

        var weekly = new List<DayOperatingScheduleDto>();
        foreach (DayOfWeek day in Enum.GetValues<DayOfWeek>())
        {
            var match = existing.FirstOrDefault(s => s.DayOfWeek == day);
            if (match != null)
            {
                weekly.Add(new DayOperatingScheduleDto(match.DayOfWeek, match.StartTime, match.EndTime, match.IsActive));
            }
            else
            {
                bool isWeekday = day >= DayOfWeek.Monday && day <= DayOfWeek.Friday;
                weekly.Add(new DayOperatingScheduleDto(day, new TimeSpan(9, 0, 0), new TimeSpan(17, 0, 0), isWeekday));
            }
        }

        return new ProviderOperatingScheduleDto(providerId, weekly);
    }

    public async Task<ProviderOperatingScheduleDto> UpdateOperatingScheduleAsync(Guid providerId, UpdateOperatingScheduleDto dto, CancellationToken ct = default)
    {
        if (dto.WeeklySchedule == null || dto.WeeklySchedule.Count == 0)
            throw new ValidationException("Weekly schedule cannot be empty.");

        foreach (var day in dto.WeeklySchedule)
        {
            if (day.IsActive && day.EndTime <= day.StartTime)
            {
                throw new ValidationException($"EndTime must be after StartTime for {day.DayOfWeek}.");
            }
        }

        var existing = await _db.ProviderOperatingSchedules
            .Where(s => s.ProviderId == providerId)
            .ToListAsync(ct);

        foreach (var dayDto in dto.WeeklySchedule)
        {
            var match = existing.FirstOrDefault(s => s.DayOfWeek == dayDto.DayOfWeek);
            if (match != null)
            {
                match.StartTime = dayDto.StartTime;
                match.EndTime = dayDto.EndTime;
                match.IsActive = dayDto.IsActive;
                match.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                _db.ProviderOperatingSchedules.Add(new ProviderOperatingSchedule
                {
                    ProviderId = providerId,
                    DayOfWeek = dayDto.DayOfWeek,
                    StartTime = dayDto.StartTime,
                    EndTime = dayDto.EndTime,
                    IsActive = dayDto.IsActive
                });
            }
        }

        await _db.SaveChangesAsync(ct);
        return await GetOperatingScheduleAsync(providerId, ct);
    }

    private static List<DayOperatingScheduleDto> GetDefaultWeeklySchedule()
    {
        var list = new List<DayOperatingScheduleDto>();
        foreach (DayOfWeek day in Enum.GetValues<DayOfWeek>())
        {
            bool isWeekday = day >= DayOfWeek.Monday && day <= DayOfWeek.Friday;
            list.Add(new DayOperatingScheduleDto(day, new TimeSpan(9, 0, 0), new TimeSpan(17, 0, 0), isWeekday));
        }
        return list;
    }

    public async Task<DailySlotsResponseDto> GetPredefinedSlotsForDateAsync(
        Guid providerId,
        DateOnly date,
        int durationHours = 1,
        CancellationToken ct = default)
    {
        if (durationHours < 1) durationHours = 1;

        var dayOfWeek = date.DayOfWeek;

        // Fetch provider's operating schedule for this DayOfWeek
        var schedule = await _db.ProviderOperatingSchedules
            .FirstOrDefaultAsync(s => s.ProviderId == providerId && s.DayOfWeek == dayOfWeek, ct);

        int startHour;
        int endHour;
        bool isWorking;

        if (schedule != null)
        {
            isWorking = schedule.IsActive;
            startHour = schedule.StartTime.Hours;
            endHour = schedule.EndTime.Hours;
        }
        else
        {
            // Fallback: Monday to Friday is 09:00 - 17:00
            isWorking = dayOfWeek >= DayOfWeek.Monday && dayOfWeek <= DayOfWeek.Friday;
            startHour = 9;
            endHour = 17;
        }

        if (!isWorking || startHour >= endHour)
        {
            return new DailySlotsResponseDto(providerId, date, durationHours, false, new List<PredefinedSlotDto>());
        }

        var dayStartUtc = new DateTimeOffset(date.Year, date.Month, date.Day, 0, 0, 0, TimeSpan.Zero);
        var dayEndUtc = dayStartUtc.AddDays(1);

        var activeBookings = await _db.Bookings
            .Include(b => b.ServiceListing)
            .Where(b => b.ProviderId == providerId
                        && b.ScheduledAt != null
                        && b.ScheduledAt < dayEndUtc
                        && b.ScheduledAt.Value.AddHours(b.ServiceListing != null ? (b.ServiceListing.DurationHours > 0 ? b.ServiceListing.DurationHours : 1) : 1) > dayStartUtc
                        && (b.Status == BookingStatus.Requested || b.Status == BookingStatus.Accepted || b.Status == BookingStatus.InProgress))
            .Select(b => new
            {
                Start = b.ScheduledAt!.Value,
                End = b.ScheduledAt.Value.AddHours(b.ServiceListing != null ? (b.ServiceListing.DurationHours > 0 ? b.ServiceListing.DurationHours : 1) : 1)
            })
            .ToListAsync(ct);

        var nowUtc = DateTimeOffset.UtcNow;
        var slots = new List<PredefinedSlotDto>();

        for (int h = startHour; h < endHour; h++)
        {
            var slotStart = new DateTimeOffset(date.Year, date.Month, date.Day, h, 0, 0, TimeSpan.Zero);
            var slotEnd = slotStart.AddHours(durationHours);
            var slotKey = $"{h:D2}:00";

            var dummyStart = DateTime.Today.AddHours(h);
            var dummyEnd = DateTime.Today.AddHours(h + durationHours);
            var displayLabel = $"{dummyStart:hh:mm tt} - {dummyEnd:hh:mm tt}";

            if (slotStart <= nowUtc)
            {
                slots.Add(new PredefinedSlotDto(slotKey, displayLabel, slotStart, slotEnd, false, "Past"));
                continue;
            }

            if (h + durationHours > endHour)
            {
                slots.Add(new PredefinedSlotDto(slotKey, displayLabel, slotStart, slotEnd, false, "InsufficientTime"));
                continue;
            }

            bool isBooked = activeBookings.Any(b => b.Start < slotEnd && slotStart < b.End);
            if (isBooked)
            {
                slots.Add(new PredefinedSlotDto(slotKey, displayLabel, slotStart, slotEnd, false, "Booked"));
                continue;
            }

            slots.Add(new PredefinedSlotDto(slotKey, displayLabel, slotStart, slotEnd, true, null));
        }

        return new DailySlotsResponseDto(providerId, date, durationHours, true, slots);
    }
}
