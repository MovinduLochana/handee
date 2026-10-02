using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Hubs;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace handee.Tests.Bookings;

public class ProviderInstantOffersTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetProviderInstantOffersAsync_ReturnsOnlyUnexpiredRequestedInstantMatches()
    {
        // Arrange
        var db = CreateContext();
        var providerAId = Guid.NewGuid();
        var providerBId = Guid.NewGuid();
        var customerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Alice Customer" };
        var providerA = new ApplicationUser { Id = providerAId, FullName = "Bob Provider" };
        var providerB = new ApplicationUser { Id = providerBId, FullName = "Charlie Provider" };
        db.Users.AddRange(customer, providerA, providerB);

        var category = new ServiceCategory { Id = Guid.NewGuid(), Name = "Electrical" };
        db.ServiceCategories.Add(category);

        var jr1 = new JobRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ServiceCategoryId = category.Id,
            Description = "Short circuit in breaker",
            Location = "Kandy",
            Urgency = JobUrgency.Emergency,
            Status = JobRequestStatus.Open
        };
        var jr2 = new JobRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ServiceCategoryId = category.Id,
            Description = "Power socket sparking",
            Location = "Kandy",
            Urgency = JobUrgency.High,
            Status = JobRequestStatus.Open
        };
        db.JobRequests.AddRange(jr1, jr2);

        var now = DateTimeOffset.UtcNow;

        // 1. Valid active instant match offer for Provider A
        var validOffer = new Booking
        {
            Id = Guid.NewGuid(),
            JobRequestId = jr1.Id,
            ProviderId = providerAId,
            CustomerId = customerId,
            Status = BookingStatus.Requested,
            BookingType = BookingType.InstantMatch,
            ExpiresAt = now.AddSeconds(80),
            CreatedAt = now.AddSeconds(-10)
        };

        // 2. Expired instant match offer for Provider A (should be excluded)
        var expiredOffer = new Booking
        {
            Id = Guid.NewGuid(),
            JobRequestId = jr2.Id,
            ProviderId = providerAId,
            CustomerId = customerId,
            Status = BookingStatus.Requested,
            BookingType = BookingType.InstantMatch,
            ExpiresAt = now.AddSeconds(-5),
            CreatedAt = now.AddSeconds(-95)
        };

        // 3. Scheduled direct booking for Provider A (should be excluded!)
        var scheduledBooking = new Booking
        {
            Id = Guid.NewGuid(),
            ProviderId = providerAId,
            CustomerId = customerId,
            Status = BookingStatus.Requested,
            BookingType = BookingType.Scheduled,
            ExpiresAt = now.AddHours(23),
            CreatedAt = now.AddHours(-1)
        };

        // 4. Accepted instant match for Provider A (should be excluded!)
        var acceptedBooking = new Booking
        {
            Id = Guid.NewGuid(),
            ProviderId = providerAId,
            CustomerId = customerId,
            Status = BookingStatus.Accepted,
            BookingType = BookingType.InstantMatch,
            ExpiresAt = now.AddSeconds(50),
            CreatedAt = now.AddSeconds(-40)
        };

        // 5. Valid active instant match for Provider B (different provider, should be excluded)
        var otherProviderOffer = new Booking
        {
            Id = Guid.NewGuid(),
            ProviderId = providerBId,
            CustomerId = customerId,
            Status = BookingStatus.Requested,
            BookingType = BookingType.InstantMatch,
            ExpiresAt = now.AddSeconds(90),
            CreatedAt = now
        };

        db.Bookings.AddRange(validOffer, expiredOffer, scheduledBooking, acceptedBooking, otherProviderOffer);
        await db.SaveChangesAsync();

        var bookingService = new BookingService(db);

        // Act (Seam 1)
        var offers = await bookingService.GetProviderInstantOffersAsync(providerAId);

        // Assert
        Assert.Single(offers);
        var offer = offers.First();
        Assert.Equal(validOffer.Id, offer.Id);
        Assert.Equal("InstantMatch", offer.BookingType);
        Assert.Equal("Requested", offer.Status);
        Assert.NotNull(offer.ExpiresAt);
        Assert.True(offer.RemainingSeconds > 0 && offer.RemainingSeconds <= 90);
    }

    [Fact]
    public async Task NotifyInstantJobDispatchedAsync_BroadcastsReceiveInstantJobOffer_ToProviderGroup()
    {
        // Arrange (Seam 2)
        var mockHubContext = new Mock<IHubContext<BookingHub, IBookingClient>>();
        var mockClients = new Mock<IHubClients<IBookingClient>>();
        var mockClientProxy = new Mock<IBookingClient>();

        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        var jobRequestId = Guid.NewGuid();
        var category = "Electrical";
        var price = 4500m;
        var expiresAtSeconds = 90;

        mockHubContext.Setup(h => h.Clients).Returns(mockClients.Object);
        mockClients.Setup(c => c.Group($"Provider_{providerId}")).Returns(mockClientProxy.Object);

        var notificationService = new BookingNotificationService(mockHubContext.Object);

        // Act
        await notificationService.NotifyInstantJobDispatchedAsync(
            providerId,
            bookingId,
            jobRequestId,
            category,
            price,
            expiresAtSeconds
        );

        // Assert
        mockClientProxy.Verify(
            c => c.ReceiveInstantJobOffer(bookingId, jobRequestId, category, price, expiresAtSeconds),
            Times.Once
        );
    }
}
