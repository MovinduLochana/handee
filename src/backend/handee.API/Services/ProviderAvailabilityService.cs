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
        var overlaps = await _db.ProviderAvailabilitySlots.AnyAsync(s =>
            s.ProviderId == providerId &&
            s.StartTime < dto.EndTime &&
            dto.StartTime < s.EndTime);

        if (overlaps)
            throw new ValidationException("This slot overlaps with an existing availability slot.");

        var slot = new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime
        };

        _db.ProviderAvailabilitySlots.Add(slot);
        await _db.SaveChangesAsync();

        return ToDto(slot);
    }

    public async Task<List<SlotResponseDto>> GetForProviderAsync(Guid providerId)
    {
        var slots = await _db.ProviderAvailabilitySlots
            .Where(s => s.ProviderId == providerId && !s.IsBooked)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        return slots.Select(ToDto).ToList();
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
