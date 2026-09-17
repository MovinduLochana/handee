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
}
