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

    private static async Task<(AppDbContext Db, Booking Booking, Guid CustomerId, Guid ProviderId)>
        SeedBookingAsync(BookingStatus status = BookingStatus.Requested)
    {
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        db.Users.Add(new ApplicationUser { Id = customerId, FullName = "C" });
        db.Users.Add(new ApplicationUser { Id = providerId, FullName = "P" });
        var booking = new Booking { ProviderId = providerId, CustomerId = customerId, Status = status };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        return (db, booking, customerId, providerId);
    }

    // ── GetByIdAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_Customer_Can_View()
    {
        var (db, booking, customerId, _) = await SeedBookingAsync();
        var sut = new BookingService(db);

        var result = await sut.GetByIdAsync(booking.Id, customerId, isRequesterAdmin: false);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetByIdAsync_Provider_Can_View()
    {
        var (db, booking, _, providerId) = await SeedBookingAsync();
        var sut = new BookingService(db);

        var result = await sut.GetByIdAsync(booking.Id, providerId, isRequesterAdmin: false);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetByIdAsync_Admin_Can_View_Anyones_Booking()
    {
        var (db, booking, _, _) = await SeedBookingAsync();
        var sut = new BookingService(db);

        var result = await sut.GetByIdAsync(booking.Id, Guid.NewGuid(), isRequesterAdmin: true);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetByIdAsync_NonParty_Gets_Null()
    {
        var (db, booking, _, _) = await SeedBookingAsync();
        var sut = new BookingService(db);

        var result = await sut.GetByIdAsync(booking.Id, Guid.NewGuid(), isRequesterAdmin: false);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByIdAsync_Returns_Null_When_Not_Found()
    {
        using var db = CreateContext();
        var sut = new BookingService(db);

        var result = await sut.GetByIdAsync(Guid.NewGuid(), Guid.NewGuid(), isRequesterAdmin: false);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetForCustomerAsync_Only_Returns_That_Customers_Bookings()
    {
        using var db = CreateContext();
        var customerA = Guid.NewGuid();
        var customerB = Guid.NewGuid();
        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();

        db.Users.Add(new ApplicationUser { Id = customerA, FullName = "Customer A" });
        db.Users.Add(new ApplicationUser { Id = customerB, FullName = "Customer B" });
        db.Users.Add(new ApplicationUser { Id = p1, FullName = "Provider 1" });
        db.Users.Add(new ApplicationUser { Id = p2, FullName = "Provider 2" });

        db.Bookings.AddRange(
            new Booking { ProviderId = p1, CustomerId = customerA },
            new Booking { ProviderId = p1, CustomerId = customerA },
            new Booking { ProviderId = p2, CustomerId = customerB });
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
        var c1 = Guid.NewGuid();
        var c2 = Guid.NewGuid();

        db.Users.Add(new ApplicationUser { Id = providerA, FullName = "Provider A" });
        db.Users.Add(new ApplicationUser { Id = providerB, FullName = "Provider B" });
        db.Users.Add(new ApplicationUser { Id = c1, FullName = "Customer 1" });
        db.Users.Add(new ApplicationUser { Id = c2, FullName = "Customer 2" });

        db.Bookings.AddRange(
            new Booking { ProviderId = providerA, CustomerId = c1 },
            new Booking { ProviderId = providerA, CustomerId = c1 },
            new Booking { ProviderId = providerB, CustomerId = c2 });
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

    // ── UpdateStatusAsync: legal transitions by the right party ─────────────

    [Fact]
    public async Task UpdateStatusAsync_Provider_Can_Accept_Requested_Booking()
    {
        var (db, booking, _, providerId) = await SeedBookingAsync(BookingStatus.Requested);
        var sut = new BookingService(db);

        var result = await sut.UpdateStatusAsync(
            booking.Id, new UpdateBookingStatusDto(BookingStatus.Accepted), providerId, isRequesterAdmin: false);

        Assert.Equal("Accepted", result.Status);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task UpdateStatusAsync_Provider_Can_Start_Accepted_Booking()
    {
        var (db, booking, _, providerId) = await SeedBookingAsync(BookingStatus.Accepted);
        var sut = new BookingService(db);

        var result = await sut.UpdateStatusAsync(
            booking.Id, new UpdateBookingStatusDto(BookingStatus.InProgress), providerId, isRequesterAdmin: false);

        Assert.Equal("InProgress", result.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_Provider_Can_Complete_InProgress_Booking()
    {
        var (db, booking, _, providerId) = await SeedBookingAsync(BookingStatus.InProgress);
        var sut = new BookingService(db);

        var result = await sut.UpdateStatusAsync(
            booking.Id, new UpdateBookingStatusDto(BookingStatus.Completed), providerId, isRequesterAdmin: false);

        Assert.Equal("Completed", result.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_Customer_Can_Dispute_Booking()
    {
        var (db, booking, customerId, _) = await SeedBookingAsync(BookingStatus.Accepted);
        var sut = new BookingService(db);

        var result = await sut.UpdateStatusAsync(
            booking.Id, new UpdateBookingStatusDto(BookingStatus.Disputed), customerId, isRequesterAdmin: false);

        Assert.Equal("Disputed", result.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_Provider_Can_Dispute_Booking()
    {
        var (db, booking, _, providerId) = await SeedBookingAsync(BookingStatus.InProgress);
        var sut = new BookingService(db);

        var result = await sut.UpdateStatusAsync(
            booking.Id, new UpdateBookingStatusDto(BookingStatus.Disputed), providerId, isRequesterAdmin: false);

        Assert.Equal("Disputed", result.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_Admin_Can_Resolve_Disputed_Booking()
    {
        var (db, booking, _, _) = await SeedBookingAsync(BookingStatus.Disputed);
        var sut = new BookingService(db);

        var result = await sut.UpdateStatusAsync(
            booking.Id, new UpdateBookingStatusDto(BookingStatus.InProgress), Guid.NewGuid(), isRequesterAdmin: true);

        Assert.Equal("InProgress", result.Status);
    }

    // ── UpdateStatusAsync: wrong party for an otherwise-legal transition ───

    [Fact]
    public async Task UpdateStatusAsync_Customer_Cannot_Accept_Booking_On_Providers_Behalf()
    {
        var (db, booking, customerId, _) = await SeedBookingAsync(BookingStatus.Requested);
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            sut.UpdateStatusAsync(
                booking.Id, new UpdateBookingStatusDto(BookingStatus.Accepted), customerId, isRequesterAdmin: false));
    }

    [Fact]
    public async Task UpdateStatusAsync_NonAdmin_Cannot_Change_Disputed_Booking()
    {
        var (db, booking, _, providerId) = await SeedBookingAsync(BookingStatus.Disputed);
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            sut.UpdateStatusAsync(
                booking.Id, new UpdateBookingStatusDto(BookingStatus.InProgress), providerId, isRequesterAdmin: false));
    }

    // ── UpdateStatusAsync: illegal transition even for the right-ish role ──

    [Fact]
    public async Task UpdateStatusAsync_Provider_Cannot_Skip_Straight_To_Completed()
    {
        var (db, booking, _, providerId) = await SeedBookingAsync(BookingStatus.Requested);
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.UpdateStatusAsync(
                booking.Id, new UpdateBookingStatusDto(BookingStatus.Completed), providerId, isRequesterAdmin: false));
    }

    [Fact]
    public async Task UpdateStatusAsync_Admin_Cannot_Skip_Straight_To_Completed_Either()
    {
        // Legality is enforced for everyone, admins included — only the
        // party/role layer on top is bypassed for admins.
        var (db, booking, _, _) = await SeedBookingAsync(BookingStatus.Requested);
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.UpdateStatusAsync(
                booking.Id, new UpdateBookingStatusDto(BookingStatus.Completed), Guid.NewGuid(), isRequesterAdmin: true));
    }

    [Fact]
    public async Task UpdateStatusAsync_NonParty_Gets_NotFound_Not_Forbidden()
    {
        var (db, booking, _, _) = await SeedBookingAsync(BookingStatus.Requested);
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.UpdateStatusAsync(
                booking.Id, new UpdateBookingStatusDto(BookingStatus.Accepted), Guid.NewGuid(), isRequesterAdmin: false));
    }

    [Fact]
    public async Task UpdateStatusAsync_Throws_NotFound_When_Booking_Missing()
    {
        using var db = CreateContext();
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.UpdateStatusAsync(
                Guid.NewGuid(), new UpdateBookingStatusDto(BookingStatus.Accepted), Guid.NewGuid(), isRequesterAdmin: false));
    }

    // ── UpdateScheduleAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task UpdateScheduleAsync_Customer_Can_Reschedule_While_Requested()
    {
        var (db, booking, customerId, _) = await SeedBookingAsync(BookingStatus.Requested);
        var sut = new BookingService(db);
        var scheduledAt = DateTimeOffset.UtcNow.AddDays(2);

        var result = await sut.UpdateScheduleAsync(
            booking.Id, new UpdateBookingScheduleDto(scheduledAt), customerId, isRequesterAdmin: false);

        Assert.Equal(scheduledAt, result.ScheduledAt);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task UpdateScheduleAsync_Provider_Can_Reschedule_While_Accepted()
    {
        var (db, booking, _, providerId) = await SeedBookingAsync(BookingStatus.Accepted);
        var sut = new BookingService(db);
        var scheduledAt = DateTimeOffset.UtcNow.AddDays(3);

        var result = await sut.UpdateScheduleAsync(
            booking.Id, new UpdateBookingScheduleDto(scheduledAt), providerId, isRequesterAdmin: false);

        Assert.Equal(scheduledAt, result.ScheduledAt);
    }

    [Theory]
    [InlineData(BookingStatus.InProgress)]
    [InlineData(BookingStatus.Completed)]
    [InlineData(BookingStatus.Disputed)]
    public async Task UpdateScheduleAsync_NonAdmin_Cannot_Reschedule_Past_Accepted(BookingStatus status)
    {
        var (db, booking, customerId, _) = await SeedBookingAsync(status);
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            sut.UpdateScheduleAsync(
                booking.Id, new UpdateBookingScheduleDto(DateTimeOffset.UtcNow), customerId, isRequesterAdmin: false));
    }

    [Fact]
    public async Task UpdateScheduleAsync_Admin_Can_Reschedule_Regardless_Of_Status()
    {
        var (db, booking, _, _) = await SeedBookingAsync(BookingStatus.Completed);
        var sut = new BookingService(db);
        var scheduledAt = DateTimeOffset.UtcNow.AddDays(1);

        var result = await sut.UpdateScheduleAsync(
            booking.Id, new UpdateBookingScheduleDto(scheduledAt), Guid.NewGuid(), isRequesterAdmin: true);

        Assert.Equal(scheduledAt, result.ScheduledAt);
    }

    [Fact]
    public async Task UpdateScheduleAsync_NonParty_Gets_NotFound()
    {
        var (db, booking, _, _) = await SeedBookingAsync(BookingStatus.Requested);
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.UpdateScheduleAsync(
                booking.Id, new UpdateBookingScheduleDto(DateTimeOffset.UtcNow), Guid.NewGuid(), isRequesterAdmin: false));
    }

    [Fact]
    public async Task UpdateScheduleAsync_Throws_NotFound_When_Booking_Missing()
    {
        using var db = CreateContext();
        var sut = new BookingService(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.UpdateScheduleAsync(
                Guid.NewGuid(), new UpdateBookingScheduleDto(DateTimeOffset.UtcNow), Guid.NewGuid(), isRequesterAdmin: false));
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
