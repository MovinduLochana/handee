using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using System.Net.Http;
using Xunit;

namespace handee.Tests.Bookings;

public class BookingExpirationServiceTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task ProcessExpiredBookingsAsync_ExpiresScheduledBooking_AndEmitsSignalRNotification()
    {
        // Arrange
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Customer Alice" };
        var provider = new ApplicationUser { Id = providerId, FullName = "Provider Bob" };
        db.Users.AddRange(customer, provider);

        var pastTime = DateTimeOffset.UtcNow.AddMinutes(-10);

        var expiredScheduled = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ScheduledAt = DateTimeOffset.UtcNow.AddDays(1),
            ExpiresAt = pastTime,
            CreatedAt = pastTime.AddHours(-24)
        };

        var futureScheduled = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ScheduledAt = DateTimeOffset.UtcNow.AddDays(2),
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(20),
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.Bookings.AddRange(expiredScheduled, futureScheduled);
        await db.SaveChangesAsync();

        var notificationServiceMock = new Mock<IBookingNotificationService>();
        var agentWorkflowServiceMock = new Mock<IAgentWorkflowService>();

        var expirationService = new BookingExpirationService(
            db,
            notificationServiceMock.Object,
            agentWorkflowServiceMock.Object);

        // Act
        var expiredCount = await expirationService.ProcessExpiredBookingsAsync();

        // Assert
        Assert.Equal(1, expiredCount);

        var refreshedExpired = await db.Bookings.FindAsync(expiredScheduled.Id);
        Assert.NotNull(refreshedExpired);
        Assert.Equal(BookingStatus.Expired, refreshedExpired.Status);
        Assert.NotNull(refreshedExpired.UpdatedAt);

        var refreshedFuture = await db.Bookings.FindAsync(futureScheduled.Id);
        Assert.NotNull(refreshedFuture);
        Assert.Equal(BookingStatus.Requested, refreshedFuture.Status);

        notificationServiceMock.Verify(n => n.NotifyBookingStatusChangedAsync(
            expiredScheduled.Id,
            customerId,
            providerId,
            BookingStatus.Expired,
            It.IsAny<DateTimeOffset>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessExpiredBookingsAsync_ExpiresInstantMatch_AndInvokesRedispatch()
    {
        // Arrange
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Customer Alice" };
        var provider = new ApplicationUser { Id = providerId, FullName = "Provider Bob" };
        db.Users.AddRange(customer, provider);

        var pastTime = DateTimeOffset.UtcNow.AddSeconds(-30);

        var expiredInstant = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.InstantMatch,
            Status = BookingStatus.Requested,
            ExpiresAt = pastTime,
            CreatedAt = pastTime.AddSeconds(-90)
        };

        db.Bookings.Add(expiredInstant);
        await db.SaveChangesAsync();

        var notificationServiceMock = new Mock<IBookingNotificationService>();
        var agentWorkflowServiceMock = new Mock<IAgentWorkflowService>();

        agentWorkflowServiceMock
            .Setup(w => w.RedispatchInstantMatchAsync(expiredInstant.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var expirationService = new BookingExpirationService(
            db,
            notificationServiceMock.Object,
            agentWorkflowServiceMock.Object);

        // Act
        var expiredCount = await expirationService.ProcessExpiredBookingsAsync();

        // Assert
        Assert.Equal(1, expiredCount);

        var refreshed = await db.Bookings.FindAsync(expiredInstant.Id);
        Assert.NotNull(refreshed);
        Assert.Equal(BookingStatus.Expired, refreshed.Status);

        agentWorkflowServiceMock.Verify(w => w.RedispatchInstantMatchAsync(
            expiredInstant.Id,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RedispatchInstantMatchAsync_DispatchesNextCandidateProvider()
    {
        // Arrange
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerAId = Guid.NewGuid();
        var providerBId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Customer Alice" };
        var providerA = new ApplicationUser { Id = providerAId, FullName = "Provider A" };
        var providerB = new ApplicationUser { Id = providerBId, FullName = "Provider B" };
        db.Users.AddRange(customer, providerA, providerB);

        var category = new ServiceCategory { Id = Guid.NewGuid(), Name = "Plumbing" };
        db.ServiceCategories.Add(category);

        var listingA = new ServiceListing
        {
            Id = Guid.NewGuid(),
            ProviderId = providerAId,
            ServiceCategoryId = category.Id,
            Title = "Plumbing Service A",
            FixedPrice = 3000m,
            IsActive = true
        };

        var listingB = new ServiceListing
        {
            Id = Guid.NewGuid(),
            ProviderId = providerBId,
            ServiceCategoryId = category.Id,
            Title = "Plumbing Service B",
            FixedPrice = 3200m,
            IsActive = true
        };

        db.ServiceListings.AddRange(listingA, listingB);

        var jobRequest = new JobRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ServiceCategoryId = category.Id,
            Description = "Leaking sink",
            Location = "Colombo",
            Status = JobRequestStatus.Open
        };
        db.JobRequests.Add(jobRequest);

        var expiredBooking = new Booking
        {
            Id = Guid.NewGuid(),
            JobRequestId = jobRequest.Id,
            ServiceListingId = listingA.Id,
            CustomerId = customerId,
            ProviderId = providerAId,
            Status = BookingStatus.Expired,
            BookingType = BookingType.InstantMatch,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1),
            CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-3)
        };
        db.Bookings.Add(expiredBooking);
        await db.SaveChangesAsync();

        var notificationServiceMock = new Mock<IBookingNotificationService>();
        var availabilityServiceMock = new Mock<IProviderAvailabilityService>();
        var invoiceServiceMock = new Mock<IInvoiceService>();
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        var loggerMock = new Mock<ILogger<AgentWorkflowService>>();

        var agentWorkflowService = new AgentWorkflowService(
            db,
            httpClientFactoryMock.Object,
            invoiceServiceMock.Object,
            loggerMock.Object,
            notificationServiceMock.Object,
            availabilityServiceMock.Object);

        // Act
        var result = await agentWorkflowService.RedispatchInstantMatchAsync(expiredBooking.Id);

        // Assert
        Assert.True(result);

        // Verify a new booking was created for providerB
        var allBookings = await db.Bookings.Where(b => b.JobRequestId == jobRequest.Id).ToListAsync();
        Assert.Equal(2, allBookings.Count);

        var newBooking = allBookings.FirstOrDefault(b => b.Id != expiredBooking.Id);
        Assert.NotNull(newBooking);
        Assert.Equal(providerBId, newBooking.ProviderId);
        Assert.Equal(BookingStatus.Requested, newBooking.Status);
        Assert.Equal(BookingType.InstantMatch, newBooking.BookingType);
        Assert.NotNull(newBooking.ExpiresAt);
        Assert.True(newBooking.ExpiresAt > DateTimeOffset.UtcNow);

        notificationServiceMock.Verify(n => n.NotifyInstantJobDispatchedAsync(
            providerBId,
            newBooking.Id,
            jobRequest.Id,
            "Plumbing",
            3200m,
            90,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessExpiredBookingsAsync_WhenNoBookingsExpired_ReturnsZeroWithoutNotifications()
    {
        // Arrange
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Customer Alice" };
        var provider = new ApplicationUser { Id = providerId, FullName = "Provider Bob" };
        db.Users.AddRange(customer, provider);

        var futureBooking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.InstantMatch,
            Status = BookingStatus.Requested,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(5)
        };
        db.Bookings.Add(futureBooking);
        await db.SaveChangesAsync();

        var notificationServiceMock = new Mock<IBookingNotificationService>();
        var agentWorkflowServiceMock = new Mock<IAgentWorkflowService>();

        var expirationService = new BookingExpirationService(
            db,
            notificationServiceMock.Object,
            agentWorkflowServiceMock.Object);

        // Act
        var expiredCount = await expirationService.ProcessExpiredBookingsAsync();

        // Assert
        Assert.Equal(0, expiredCount);
        notificationServiceMock.Verify(n => n.NotifyBookingStatusChangedAsync(
            It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<BookingStatus>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ProcessExpiredBookingsAsync_WhenOneRedispatchThrows_ContinuesProcessingRemainingBookings()
    {
        // Arrange
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Customer Alice" };
        var provider = new ApplicationUser { Id = providerId, FullName = "Provider Bob" };
        db.Users.AddRange(customer, provider);

        var pastTime = DateTimeOffset.UtcNow.AddMinutes(-5);

        // Booking 1: Instant match that throws during redispatch
        var faultyInstant = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.InstantMatch,
            Status = BookingStatus.Requested,
            ExpiresAt = pastTime
        };

        // Booking 2: Scheduled booking that succeeds
        var regularScheduled = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ProviderId = providerId,
            BookingType = BookingType.Scheduled,
            Status = BookingStatus.Requested,
            ExpiresAt = pastTime
        };

        db.Bookings.AddRange(faultyInstant, regularScheduled);
        await db.SaveChangesAsync();

        var notificationServiceMock = new Mock<IBookingNotificationService>();
        var agentWorkflowServiceMock = new Mock<IAgentWorkflowService>();

        agentWorkflowServiceMock
            .Setup(w => w.RedispatchInstantMatchAsync(faultyInstant.Id, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Simulated Redispatch Error"));

        var expirationService = new BookingExpirationService(
            db,
            notificationServiceMock.Object,
            agentWorkflowServiceMock.Object);

        // Act
        var count = await expirationService.ProcessExpiredBookingsAsync();

        // Assert: Both bookings should still be transitioned to Expired in DB
        Assert.Equal(2, count);

        var b1 = await db.Bookings.FindAsync(faultyInstant.Id);
        var b2 = await db.Bookings.FindAsync(regularScheduled.Id);

        Assert.NotNull(b1);
        Assert.Equal(BookingStatus.Expired, b1.Status);

        Assert.NotNull(b2);
        Assert.Equal(BookingStatus.Expired, b2.Status);

        notificationServiceMock.Verify(n => n.NotifyBookingStatusChangedAsync(
            regularScheduled.Id, customerId, providerId, BookingStatus.Expired, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
