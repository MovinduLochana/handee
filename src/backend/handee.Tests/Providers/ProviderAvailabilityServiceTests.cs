using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.Providers;

public class ProviderAvailabilityServiceTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateSlotAsync_Rejects_EndTime_Before_StartTime()
    {
        using var db = CreateContext();
        var sut = new ProviderAvailabilityService(db);
        var start = DateTimeOffset.UtcNow.AddDays(1);

        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateSlotAsync(Guid.NewGuid(), new CreateSlotDto { StartTime = start, EndTime = start.AddHours(-1) }));
    }

    [Fact]
    public async Task CreateSlotAsync_Rejects_Overlapping_Slot()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow.AddDays(1);

        db.ProviderAvailabilitySlots.Add(new ProviderAvailabilitySlot
        {
            ProviderId = providerId, StartTime = start, EndTime = start.AddHours(2)
        });
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);

        // Overlaps the middle of the existing 2-hour slot.
        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateSlotAsync(providerId, new CreateSlotDto
            {
                StartTime = start.AddMinutes(30),
                EndTime = start.AddMinutes(90)
            }));
    }

    [Fact]
    public async Task CreateSlotAsync_Allows_NonOverlapping_Slot()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow.AddDays(1);

        db.ProviderAvailabilitySlots.Add(new ProviderAvailabilitySlot
        {
            ProviderId = providerId, StartTime = start, EndTime = start.AddHours(1)
        });
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.CreateSlotAsync(providerId, new CreateSlotDto
        {
            StartTime = start.AddHours(1),
            EndTime = start.AddHours(2)
        });

        Assert.Equal(providerId, result.ProviderId);
        Assert.False(result.IsBooked);
    }

    [Fact]
    public async Task DeleteSlotAsync_Owner_Can_Delete_Own_Unbooked_Slot()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var slot = new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = DateTimeOffset.UtcNow.AddDays(1),
            EndTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1)
        };
        db.ProviderAvailabilitySlots.Add(slot);
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);
        await sut.DeleteSlotAsync(slot.Id, providerId);

        Assert.Empty(db.ProviderAvailabilitySlots);
    }

    [Fact]
    public async Task DeleteSlotAsync_Different_Provider_Cannot_Delete_Gets_NotFound()
    {
        using var db = CreateContext();
        var ownerId = Guid.NewGuid();
        var slot = new ProviderAvailabilitySlot
        {
            ProviderId = ownerId,
            StartTime = DateTimeOffset.UtcNow.AddDays(1),
            EndTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1)
        };
        db.ProviderAvailabilitySlots.Add(slot);
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.DeleteSlotAsync(slot.Id, Guid.NewGuid()));

        Assert.Single(db.ProviderAvailabilitySlots);
    }

    [Fact]
    public async Task DeleteSlotAsync_Cannot_Delete_Booked_Slot()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var slot = new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = DateTimeOffset.UtcNow.AddDays(1),
            EndTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            IsBooked = true
        };
        db.ProviderAvailabilitySlots.Add(slot);
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.DeleteSlotAsync(slot.Id, providerId));

        Assert.Single(db.ProviderAvailabilitySlots);
    }

    [Fact]
    public async Task GetForProviderAsync_Returns_Another_Providers_Unbooked_Slots()
    {
        // This one is deliberately cross-user visible — any authenticated
        // user needs to see a specific provider's open slots to eventually
        // book them.
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        db.ProviderAvailabilitySlots.Add(new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = DateTimeOffset.UtcNow.AddDays(1),
            EndTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1)
        });
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.GetForProviderAsync(providerId);

        Assert.Single(result);
        Assert.Equal(providerId, result[0].ProviderId);
    }

    [Fact]
    public async Task GetForProviderAsync_Excludes_Booked_Slots()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        db.ProviderAvailabilitySlots.AddRange(
            new ProviderAvailabilitySlot
            {
                ProviderId = providerId,
                StartTime = DateTimeOffset.UtcNow.AddDays(1),
                EndTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
                IsBooked = true
            },
            new ProviderAvailabilitySlot
            {
                ProviderId = providerId,
                StartTime = DateTimeOffset.UtcNow.AddDays(2),
                EndTime = DateTimeOffset.UtcNow.AddDays(2).AddHours(1),
                IsBooked = false
            });
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.GetForProviderAsync(providerId);

        Assert.Single(result);
        Assert.False(result[0].IsBooked);
    }

    [Fact]
    public async Task GetOwnAsync_Includes_Booked_Slots()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        db.ProviderAvailabilitySlots.AddRange(
            new ProviderAvailabilitySlot
            {
                ProviderId = providerId,
                StartTime = DateTimeOffset.UtcNow.AddDays(1),
                EndTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
                IsBooked = true
            },
            new ProviderAvailabilitySlot
            {
                ProviderId = providerId,
                StartTime = DateTimeOffset.UtcNow.AddDays(2),
                EndTime = DateTimeOffset.UtcNow.AddDays(2).AddHours(1),
                IsBooked = false
            });
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.GetOwnAsync(providerId);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetForProviderAsync_Filters_Past_Slots()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        db.ProviderAvailabilitySlots.AddRange(
            new ProviderAvailabilitySlot
            {
                ProviderId = providerId,
                StartTime = DateTimeOffset.UtcNow.AddDays(-1),
                EndTime = DateTimeOffset.UtcNow.AddDays(-1).AddHours(1),
                IsBooked = false
            },
            new ProviderAvailabilitySlot
            {
                ProviderId = providerId,
                StartTime = DateTimeOffset.UtcNow.AddDays(1),
                EndTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
                IsBooked = false
            });
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.GetForProviderAsync(providerId);

        Assert.Single(result);
        Assert.True(result[0].StartTime > DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task GetForProviderAsync_Filters_By_DateRange()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var baseDate = DateTimeOffset.UtcNow.AddDays(1);
        db.ProviderAvailabilitySlots.AddRange(
            new ProviderAvailabilitySlot
            {
                ProviderId = providerId,
                StartTime = baseDate,
                EndTime = baseDate.AddHours(1),
                IsBooked = false
            },
            new ProviderAvailabilitySlot
            {
                ProviderId = providerId,
                StartTime = baseDate.AddDays(2),
                EndTime = baseDate.AddDays(2).AddHours(1),
                IsBooked = false
            },
            new ProviderAvailabilitySlot
            {
                ProviderId = providerId,
                StartTime = baseDate.AddDays(4),
                EndTime = baseDate.AddDays(4).AddHours(1),
                IsBooked = false
            });
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.GetForProviderAsync(
            providerId,
            startDate: baseDate.AddDays(1),
            endDate: baseDate.AddDays(3));

        Assert.Single(result);
        Assert.Equal(baseDate.AddDays(2), result[0].StartTime);
    }

    [Fact]
    public async Task CreateBatchSlotsAsync_Creates_All_Slots()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow.AddDays(2);

        var dto = new BatchCreateSlotsDto
        {
            Slots = new List<CreateSlotDto>
            {
                new() { StartTime = start, EndTime = start.AddHours(1) },
                new() { StartTime = start.AddHours(1), EndTime = start.AddHours(2) },
                new() { StartTime = start.AddHours(2), EndTime = start.AddHours(3) }
            }
        };

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.CreateBatchSlotsAsync(providerId, dto);

        Assert.Equal(3, result.Count);
        Assert.Equal(3, await db.ProviderAvailabilitySlots.CountAsync());
    }

    [Fact]
    public async Task CreateBatchSlotsAsync_Rejects_If_Batch_Has_Internal_Overlap()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow.AddDays(2);

        var dto = new BatchCreateSlotsDto
        {
            Slots = new List<CreateSlotDto>
            {
                new() { StartTime = start, EndTime = start.AddHours(2) },
                new() { StartTime = start.AddHours(1), EndTime = start.AddHours(3) }
            }
        };

        var sut = new ProviderAvailabilityService(db);
        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateBatchSlotsAsync(providerId, dto));

        Assert.Empty(db.ProviderAvailabilitySlots);
    }

    [Fact]
    public async Task CreateBatchSlotsAsync_Rejects_If_Overlaps_Existing_Slot()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow.AddDays(2);

        db.ProviderAvailabilitySlots.Add(new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = start,
            EndTime = start.AddHours(2)
        });
        await db.SaveChangesAsync();

        var dto = new BatchCreateSlotsDto
        {
            Slots = new List<CreateSlotDto>
            {
                new() { StartTime = start.AddHours(3), EndTime = start.AddHours(4) },
                new() { StartTime = start.AddMinutes(30), EndTime = start.AddHours(1) } // overlaps
            }
        };

        var sut = new ProviderAvailabilityService(db);
        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateBatchSlotsAsync(providerId, dto));

        Assert.Single(db.ProviderAvailabilitySlots);
    }

    [Fact]
    public async Task CreateRecurringSlotsAsync_Generates_Weekly_Slots()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();

        // Find the next upcoming Monday
        var today = DateTimeOffset.UtcNow.Date;
        var daysUntilMonday = ((int)DayOfWeek.Monday - (int)today.DayOfWeek + 7) % 7;
        if (daysUntilMonday == 0) daysUntilMonday = 7;
        var nextMonday = new DateTimeOffset(today.AddDays(daysUntilMonday), TimeSpan.Zero);

        var dto = new RecurringScheduleDto
        {
            DaysOfWeek = new List<DayOfWeek> { DayOfWeek.Monday },
            DailyStartTime = TimeSpan.FromHours(9),
            DailyEndTime = TimeSpan.FromHours(11),
            SlotDurationMinutes = 60,
            StartDate = nextMonday,
            EndDate = nextMonday.AddDays(7) // Covers next Monday and the following Monday
        };

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.CreateRecurringSlotsAsync(providerId, dto);

        // 2 slots per Monday (09:00-10:00, 10:00-11:00) across 2 Mondays = 4 slots
        Assert.Equal(4, result.Count);
        Assert.All(result, s => Assert.Equal(DayOfWeek.Monday, s.StartTime.DayOfWeek));
    }

    [Fact]
    public async Task CreateRecurringSlotsAsync_WithTimeZoneOffset_GeneratesSlotsInLocalTime()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        // Sri Lanka / India offset: +05:30 = 330 minutes
        var offsetMinutes = 330;
        var offset = TimeSpan.FromMinutes(offsetMinutes);

        var localMonday = new DateTimeOffset(new DateTime(2026, 11, 2, 0, 0, 0), offset);

        var dto = new RecurringScheduleDto
        {
            DaysOfWeek = new List<DayOfWeek> { DayOfWeek.Monday },
            DailyStartTime = TimeSpan.FromHours(9), // 09:00 local
            DailyEndTime = TimeSpan.FromHours(11),   // 11:00 local
            SlotDurationMinutes = 60,
            StartDate = localMonday.ToUniversalTime(), // Sent as UTC from frontend
            EndDate = localMonday.AddDays(1).ToUniversalTime(),
            TimeZoneOffsetMinutes = offsetMinutes
        };

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.CreateRecurringSlotsAsync(providerId, dto);

        Assert.Equal(2, result.Count);
        // Slot 1: 09:00 local (+05:30) = 03:30 UTC
        var slot1 = result[0];
        Assert.Equal(TimeSpan.Zero, slot1.StartTime.Offset); // Stored as UTC (0 offset) for PostgreSQL
        Assert.Equal(9, slot1.StartTime.ToOffset(offset).Hour);
        Assert.Equal(0, slot1.StartTime.ToOffset(offset).Minute);
        Assert.Equal(10, slot1.EndTime.ToOffset(offset).Hour);
        Assert.Equal(3, slot1.StartTime.Hour); // 03:30 UTC
        Assert.Equal(30, slot1.StartTime.Minute);
    }

    [Fact]
    public async Task GetForProviderAsync_Excludes_Slots_Overlapping_Active_Booking()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow.AddDays(2);

        // Slot 1: 10:00 - 11:00 (has active booking)
        var slot1 = new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = start.AddHours(10),
            EndTime = start.AddHours(11),
            IsBooked = false // not yet flagged in slot table
        };
        // Slot 2: 12:00 - 13:00 (free)
        var slot2 = new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = start.AddHours(12),
            EndTime = start.AddHours(13),
            IsBooked = false
        };
        db.ProviderAvailabilitySlots.AddRange(slot1, slot2);

        // Add overlapping active booking for slot1
        db.Bookings.Add(new Booking
        {
            ProviderId = providerId,
            CustomerId = customerId,
            Status = BookingStatus.Accepted,
            ScheduledAt = start.AddHours(10)
        });
        await db.SaveChangesAsync();

        var sut = new ProviderAvailabilityService(db);
        var result = await sut.GetForProviderAsync(providerId);

        Assert.Single(result);
        Assert.Equal(slot2.Id, result[0].Id);
    }
}
