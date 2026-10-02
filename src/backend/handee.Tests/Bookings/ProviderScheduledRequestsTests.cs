using handee.API.Controllers;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Security.Claims;
using Xunit;

namespace handee.Tests.Bookings;

public class ProviderScheduledRequestsTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetProviderScheduledRequestsAsync_ReturnsOnlyUnexpiredRequestedScheduledBookings()
    {
        // Arrange
        var db = CreateContext();
        var providerId = Guid.NewGuid();
        var otherProviderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Customer Alice" };
        var provider = new ApplicationUser { Id = providerId, FullName = "Provider Bob" };
        var otherProvider = new ApplicationUser { Id = otherProviderId, FullName = "Provider Charlie" };
        db.Users.AddRange(customer, provider, otherProvider);

        var category = new ServiceCategory { Id = Guid.NewGuid(), Name = "Plumbing" };
        db.ServiceCategories.Add(category);

        var listing = new ServiceListing
        {
            Id = Guid.NewGuid(),
            ProviderId = providerId,
            ServiceCategoryId = category.Id,
            Title = "Pipe Repair Service",
            Description = "Fix leaking pipe",
            FixedPrice = 3500m,
            DurationHours = 2,
            IsActive = true
        };
        db.ServiceListings.Add(listing);

        var now = DateTimeOffset.UtcNow;

        // 1. Valid pending Scheduled booking for provider (24h expiry) -> SHOULD RETURN
        var validScheduled = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            ServiceListingId = listing.Id,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ScheduledAt = now.AddDays(2),
            ExpiresAt = now.AddHours(23),
            Notes = "Please bring extra washer",
            CreatedAt = now.AddHours(-1)
        };

        // 2. Expired Scheduled booking -> SHOULD NOT RETURN
        var expiredScheduled = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            ServiceListingId = listing.Id,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ScheduledAt = now.AddDays(1),
            ExpiresAt = now.AddMinutes(-5),
            CreatedAt = now.AddHours(-25)
        };

        // 3. Accepted Scheduled booking -> SHOULD NOT RETURN
        var acceptedScheduled = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            ServiceListingId = listing.Id,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Accepted,
            ScheduledAt = now.AddDays(3),
            ExpiresAt = now.AddHours(20),
            CreatedAt = now.AddHours(-2)
        };

        // 4. InstantMatch booking in Requested status -> SHOULD NOT RETURN
        var instantOffer = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.InstantMatch,
            Status = BookingStatus.Requested,
            ExpiresAt = now.AddSeconds(75),
            CreatedAt = now
        };

        // 5. Scheduled booking for a different provider -> SHOULD NOT RETURN
        var otherProviderScheduled = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = otherProviderId,
            ServiceListingId = listing.Id,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ScheduledAt = now.AddDays(2),
            ExpiresAt = now.AddHours(23),
            CreatedAt = now
        };

        db.Bookings.AddRange(validScheduled, expiredScheduled, acceptedScheduled, instantOffer, otherProviderScheduled);
        await db.SaveChangesAsync();

        var invoiceServiceMock = new Mock<IInvoiceService>();
        var notificationServiceMock = new Mock<IBookingNotificationService>();

        var bookingService = new BookingService(
            db,
            invoiceServiceMock.Object,
            notificationServiceMock.Object);

        // Act
        var results = await bookingService.GetProviderScheduledRequestsAsync(providerId);

        // Assert
        Assert.Single(results);
        var item = results[0];
        Assert.Equal(validScheduled.Id, item.Id);
        Assert.Equal("Scheduled", item.BookingType);
        Assert.Equal("Requested", item.Status);
        Assert.Equal("Please bring extra washer", item.Notes);
        Assert.Equal("Customer Alice", item.CustomerName);
        Assert.NotNull(item.ExpiresAt);
        Assert.True(item.RemainingSeconds > 0);
    }

    [Fact]
    public async Task BookingController_GetProviderBookingRequests_ReturnsOkWithList()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var bookingServiceMock = new Mock<IBookingService>();
        var fakeList = new List<BookingResponseDto>
        {
            new(
                Guid.NewGuid(),
                null,
                Guid.NewGuid(),
                providerId,
                Guid.NewGuid(),
                "Requested",
                DateTimeOffset.UtcNow.AddDays(1),
                DateTimeOffset.UtcNow,
                null,
                BookingType: "Scheduled",
                ExpiresAt: DateTimeOffset.UtcNow.AddHours(20),
                RemainingSeconds: 72000
            )
        };

        bookingServiceMock
            .Setup(s => s.GetProviderScheduledRequestsAsync(providerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(fakeList);

        var controller = new BookingController(bookingServiceMock.Object);
        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, providerId.ToString()),
            new Claim(ClaimTypes.Role, "Provider")
        ], "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        // Act
        var actionResult = await controller.GetProviderBookingRequests(CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var returned = Assert.IsType<List<BookingResponseDto>>(okResult.Value);
        Assert.Single(returned);
        Assert.Equal("Scheduled", returned[0].BookingType);
    }

    [Fact]
    public async Task DeclineBookingAsync_TransitionsToDeclined_AndAppendsReason()
    {
        // Arrange
        var db = CreateContext();
        var providerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Customer Alice" };
        var provider = new ApplicationUser { Id = providerId, FullName = "Provider Bob" };
        db.Users.AddRange(customer, provider);

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ScheduledAt = DateTimeOffset.UtcNow.AddDays(2),
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(23),
            Notes = "Original notes"
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var invoiceServiceMock = new Mock<IInvoiceService>();
        var notificationServiceMock = new Mock<IBookingNotificationService>();

        var bookingService = new BookingService(
            db,
            invoiceServiceMock.Object,
            notificationServiceMock.Object);

        // Act
        var result = await bookingService.DeclineBookingAsync(booking.Id, providerId, "Schedule conflict with personal event");

        // Assert
        Assert.Equal("Declined", result.Status);
        Assert.Contains("Schedule conflict with personal event", result.Notes);

        var dbBooking = await db.Bookings.FindAsync(booking.Id);
        Assert.NotNull(dbBooking);
        Assert.Equal(BookingStatus.Declined, dbBooking.Status);

        notificationServiceMock.Verify(n => n.NotifyBookingStatusChangedAsync(
            booking.Id,
            customerId,
            providerId,
            BookingStatus.Declined,
            It.IsAny<DateTimeOffset>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeclineBookingAsync_FreesReservedSlot_AllowingNewBooking()
    {
        // Arrange
        var db = CreateContext();
        var providerId = Guid.NewGuid();
        var customer1Id = Guid.NewGuid();
        var customer2Id = Guid.NewGuid();

        var provider = new ApplicationUser { Id = providerId, FullName = "Provider Bob" };
        var customer1 = new ApplicationUser { Id = customer1Id, FullName = "Customer 1" };
        var customer2 = new ApplicationUser { Id = customer2Id, FullName = "Customer 2" };
        db.Users.AddRange(provider, customer1, customer2);

        var category = new ServiceCategory { Id = Guid.NewGuid(), Name = "Carpentry" };
        db.ServiceCategories.Add(category);

        var listing = new ServiceListing
        {
            Id = Guid.NewGuid(),
            ProviderId = providerId,
            ServiceCategoryId = category.Id,
            Title = "Furniture Assembly",
            FixedPrice = 5000m,
            DurationHours = 2,
            IsActive = true
        };
        db.ServiceListings.Add(listing);

        var slotTime = new DateTimeOffset(2026, 10, 15, 10, 0, 0, TimeSpan.Zero);

        // Customer 1 books slot
        var booking1 = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customer1Id,
            ProviderId = providerId,
            ServiceListingId = listing.Id,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ScheduledAt = slotTime,
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(24)
        };
        db.Bookings.Add(booking1);
        await db.SaveChangesAsync();

        var invoiceServiceMock = new Mock<IInvoiceService>();
        var notificationServiceMock = new Mock<IBookingNotificationService>();

        var bookingService = new BookingService(
            db,
            invoiceServiceMock.Object,
            notificationServiceMock.Object);

        // Verify conflict initially
        await Assert.ThrowsAsync<handee.API.Exceptions.ValidationException>(() =>
            bookingService.CreateFromListingAsync(
                new CreateListingBookingDto(listing.Id, slotTime),
                customer2Id,
                CancellationToken.None));

        // Provider declines Customer 1's booking
        await bookingService.DeclineBookingAsync(booking1.Id, providerId, "Fully booked for personal reasons");

        // Act: Now Customer 2 should be able to book the exact same slot without conflict!
        var newBooking = await bookingService.CreateFromListingAsync(
            new CreateListingBookingDto(listing.Id, slotTime),
            customer2Id,
            CancellationToken.None);

        // Assert
        Assert.NotNull(newBooking);
        Assert.Equal("Requested", newBooking.Status);
        Assert.Equal(slotTime, newBooking.ScheduledAt);
    }

    [Fact]
    public async Task DeclineBookingAsync_WhenStatusIsNotRequested_ThrowsValidationException()
    {
        // Arrange
        var db = CreateContext();
        var providerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Accepted,
            ScheduledAt = DateTimeOffset.UtcNow.AddDays(2),
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(23)
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var bookingService = new BookingService(db);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<handee.API.Exceptions.ValidationException>(() =>
            bookingService.DeclineBookingAsync(booking.Id, providerId, "Changed my mind"));

        Assert.Contains("Cannot decline booking with status 'Accepted'", ex.Message);
    }

    [Fact]
    public async Task DeclineBookingAsync_WhenProviderIdDoesNotMatch_ThrowsNotFoundException()
    {
        // Arrange
        var db = CreateContext();
        var providerId = Guid.NewGuid();
        var imposterProviderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ScheduledAt = DateTimeOffset.UtcNow.AddDays(2),
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(23)
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var bookingService = new BookingService(db);

        // Act & Assert
        await Assert.ThrowsAsync<handee.API.Exceptions.NotFoundException>(() =>
            bookingService.DeclineBookingAsync(booking.Id, imposterProviderId, "Reject"));
    }

    [Fact]
    public async Task DeclineBookingAsync_WithNullOrWhitespaceReason_LeavesNotesIntact()
    {
        // Arrange
        var db = CreateContext();
        var providerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ScheduledAt = DateTimeOffset.UtcNow.AddDays(2),
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(23),
            Notes = "Customer special instructions"
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var bookingService = new BookingService(db);

        // Act
        var result = await bookingService.DeclineBookingAsync(booking.Id, providerId, "   ");

        // Assert
        Assert.Equal("Declined", result.Status);
        Assert.Equal("Customer special instructions", result.Notes);
    }
}
