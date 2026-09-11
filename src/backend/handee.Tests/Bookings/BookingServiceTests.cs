using System.Reflection;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.Bookings;

public class BookingServiceTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetByIdAsync_Returns_Matching_Booking()
    {
        using var db = CreateContext();
        var booking = new Booking { ProviderId = Guid.NewGuid(), CustomerId = Guid.NewGuid() };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var sut = new BookingService(db);
        var result = await sut.GetByIdAsync(booking.Id);

        Assert.NotNull(result);
        Assert.Equal(booking.Id, result!.Id);
    }

    [Fact]
    public async Task GetByIdAsync_Returns_Null_When_Not_Found()
    {
        using var db = CreateContext();
        var sut = new BookingService(db);

        var result = await sut.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetForCustomerAsync_Only_Returns_That_Customers_Bookings()
    {
        using var db = CreateContext();
        var customerA = Guid.NewGuid();
        var customerB = Guid.NewGuid();

        db.Bookings.AddRange(
            new Booking { ProviderId = Guid.NewGuid(), CustomerId = customerA },
            new Booking { ProviderId = Guid.NewGuid(), CustomerId = customerA },
            new Booking { ProviderId = Guid.NewGuid(), CustomerId = customerB });
        await db.SaveChangesAsync();

        var sut = new BookingService(db);
        var result = await sut.GetForCustomerAsync(customerA);

        Assert.Equal(2, result.Count);
        Assert.All(result, b => Assert.Equal(customerA, b.CustomerId));
        Assert.DoesNotContain(result, b => b.CustomerId == customerB);
    }

    [Fact]
    public async Task GetForProviderAsync_Only_Returns_That_Providers_Bookings()
    {
        using var db = CreateContext();
        var providerA = Guid.NewGuid();
        var providerB = Guid.NewGuid();

        db.Bookings.AddRange(
            new Booking { ProviderId = providerA, CustomerId = Guid.NewGuid() },
            new Booking { ProviderId = providerA, CustomerId = Guid.NewGuid() },
            new Booking { ProviderId = providerB, CustomerId = Guid.NewGuid() });
        await db.SaveChangesAsync();

        var sut = new BookingService(db);
        var result = await sut.GetForProviderAsync(providerA);

        Assert.Equal(2, result.Count);
        Assert.All(result, b => Assert.Equal(providerA, b.ProviderId));
        Assert.DoesNotContain(result, b => b.ProviderId == providerB);
    }

    [Fact]
    public async Task GetForStaffAsync_Filters_By_Status()
    {
        using var db = CreateContext();
        db.Bookings.AddRange(
            new Booking { ProviderId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Status = BookingStatus.Disputed },
            new Booking { ProviderId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Status = BookingStatus.Requested },
            new Booking { ProviderId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Status = BookingStatus.Requested });
        await db.SaveChangesAsync();

        var sut = new BookingService(db);
        var result = await sut.GetForStaffAsync(
            status: BookingStatus.Requested, sortDescending: true, page: 1, pageSize: 20);

        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, b => Assert.Equal("Requested", b.Status));
    }

    [Fact]
    public async Task UpdateStatusAsync_Updates_Status_And_UpdatedAt()
    {
        using var db = CreateContext();
        var booking = new Booking { ProviderId = Guid.NewGuid(), CustomerId = Guid.NewGuid() };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var sut = new BookingService(db);
        var result = await sut.UpdateStatusAsync(booking.Id, new UpdateBookingStatusDto(BookingStatus.Accepted));

        Assert.Equal("Accepted", result.Status);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task UpdateStatusAsync_Throws_NotFound_When_Booking_Missing()
    {
        using var db = CreateContext();
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.UpdateStatusAsync(Guid.NewGuid(), new UpdateBookingStatusDto(BookingStatus.Accepted)));
    }

    [Fact]
    public async Task UpdateScheduleAsync_Updates_ScheduledAt_And_UpdatedAt()
    {
        using var db = CreateContext();
        var booking = new Booking { ProviderId = Guid.NewGuid(), CustomerId = Guid.NewGuid() };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var scheduledAt = DateTimeOffset.UtcNow.AddDays(2);
        var sut = new BookingService(db);
        var result = await sut.UpdateScheduleAsync(booking.Id, new UpdateBookingScheduleDto(scheduledAt));

        Assert.Equal(scheduledAt, result.ScheduledAt);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task UpdateScheduleAsync_Throws_NotFound_When_Booking_Missing()
    {
        using var db = CreateContext();
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.UpdateScheduleAsync(Guid.NewGuid(), new UpdateBookingScheduleDto(DateTimeOffset.UtcNow)));
    }

    [Fact]
    public void CreateBooking_Does_Not_Exist_On_Interface_Or_Implementation()
    {
        // Protects the deliberate scope decision: Booking creation from a
        // matched JobRequest + Provider has no agreed contract yet (owned by
        // a different, still-in-discussion component) and must not be added
        // here without that agreement.
        var interfaceMethods = typeof(IBookingService).GetMethods();
        var classMethods = typeof(BookingService).GetMethods(
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);

        Assert.DoesNotContain(interfaceMethods,
            m => m.Name.Contains("Create", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(classMethods,
            m => m.Name.Contains("Create", StringComparison.OrdinalIgnoreCase));
    }
}
