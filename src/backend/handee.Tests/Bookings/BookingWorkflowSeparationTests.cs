using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace handee.Tests.Bookings;

public class BookingWorkflowSeparationTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<(AppDbContext Db, ServiceListing Listing, Guid CustomerId, Guid ProviderId)>
        SeedListingAndProviderAsync()
    {
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        var customer = new ApplicationUser
        {
            Id = customerId,
            FullName = "Jane Customer",
            Email = "customer@example.com",
            PhoneNumber = "0771234567"
        };
        var provider = new ApplicationUser
        {
            Id = providerId,
            FullName = "Bob Provider",
            Email = "provider@example.com",
            PhoneNumber = "0777654321"
        };
        db.Users.AddRange(customer, provider);

        var category = new ServiceCategory
        {
            Id = Guid.NewGuid(),
            Name = "Plumbing"
        };
        db.ServiceCategories.Add(category);

        var listing = new ServiceListing
        {
            Id = Guid.NewGuid(),
            ProviderId = providerId,
            ServiceCategoryId = category.Id,
            Title = "Emergency Pipe Leak Repair",
            Description = "Fix burst pipes quickly",
            Scope = "Includes standard parts",
            Availability = "Mon-Fri 9AM-5PM",
            FixedPrice = 4500m,
            DurationHours = 1,
            EstimatedDuration = TimeSpan.FromHours(1),
            IsActive = true,
            Provider = provider,
            Category = category
        };
        db.ServiceListings.Add(listing);

        for (int i = 0; i < 7; i++)
        {
            db.ProviderOperatingSchedules.Add(new ProviderOperatingSchedule
            {
                ProviderId = providerId,
                DayOfWeek = (DayOfWeek)i,
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(18, 0, 0),
                IsActive = true
            });
        }

        await db.SaveChangesAsync();
        return (db, listing, customerId, providerId);
    }

    [Fact]
    public async Task CreateFromListingAsync_SetsBookingTypeToScheduled_AndComputesLongExpiration()
    {
        // Arrange
        var (db, listing, customerId, _) = await SeedListingAndProviderAsync();
        var bookingService = new BookingService(db);

        // Schedule 3 days from now at 10:00 UTC
        var scheduledAt = DateTime.UtcNow.Date.AddDays(3).AddHours(10);
        var scheduledOffset = new DateTimeOffset(scheduledAt, TimeSpan.Zero);

        var dto = new CreateListingBookingDto(
            ServiceListingId: listing.Id,
            ScheduledAt: scheduledOffset,
            Notes: "Please bring pipe sealing tape."
        );

        // Act
        var result = await bookingService.CreateFromListingAsync(dto, customerId);

        // Assert (Seam 1)
        Assert.Equal("Scheduled", result.BookingType);
        Assert.NotNull(result.ExpiresAt);
        // Expiration should be roughly 24 hours from now
        var diffFromNow = result.ExpiresAt.Value - DateTimeOffset.UtcNow;
        Assert.True(diffFromNow.TotalHours >= 23 && diffFromNow.TotalHours <= 25,
            $"Expected ~24h expiration, but got {diffFromNow.TotalHours} hours.");
        Assert.True(result.RemainingSeconds > 0, "Remaining seconds should be positive.");

        // Assert entity in database
        var savedBooking = await db.Bookings.FindAsync(result.Id);
        Assert.NotNull(savedBooking);
        Assert.Equal(BookingType.Scheduled, savedBooking.BookingType);
        Assert.NotNull(savedBooking.ExpiresAt);
    }

    [Fact]
    public async Task CreateFromListingAsync_CapsExpiration_IfAppointmentIsWithin24Hours()
    {
        // Arrange
        var (db, listing, customerId, _) = await SeedListingAndProviderAsync();
        var bookingService = new BookingService(db);

        // Schedule tomorrow at 9:00 UTC (during operating hours 8:00-18:00)
        // If current UTC time is > 9:00, tomorrow 9:00 is between 12 and 23 hours in the future
        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var scheduledOffset = new DateTimeOffset(tomorrow.Year, tomorrow.Month, tomorrow.Day, 9, 0, 0, TimeSpan.Zero);

        var dto = new CreateListingBookingDto(
            ServiceListingId: listing.Id,
            ScheduledAt: scheduledOffset,
            Notes: "Urgent fix needed soon."
        );

        // Act
        var result = await bookingService.CreateFromListingAsync(dto, customerId);

        // Assert: Expiration should be capped at 2 hours before scheduled time (i.e. ~8 hours from now)
        Assert.Equal("Scheduled", result.BookingType);
        Assert.NotNull(result.ExpiresAt);
        Assert.True(result.ExpiresAt.Value < scheduledOffset, "ExpiresAt must be before scheduled time.");
        Assert.True(result.ExpiresAt.Value <= scheduledOffset.AddHours(-2), "ExpiresAt should be at least 2 hours before scheduled time.");
    }

    [Fact]
    public async Task DispatchWorkflowAsync_SetsBookingTypeToInstantMatch_AndComputesShortExpiration()
    {
        // Arrange
        var (db, listing, customerId, providerId) = await SeedListingAndProviderAsync();

        var jobRequest = new JobRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ServiceCategoryId = listing.ServiceCategoryId,
            Description = "Kitchen pipe burst water spraying",
            Location = "Colombo 07",
            Urgency = JobUrgency.High,
            Status = JobRequestStatus.PendingAiReview,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.JobRequests.Add(jobRequest);
        await db.SaveChangesAsync();

        var mockHttpFactory = new Mock<IHttpClientFactory>();
        var mockInvoiceService = new Mock<IInvoiceService>();
        var mockLogger = new Mock<ILogger<AgentWorkflowService>>();

        // Create AgentWorkflowService with fallbacks enabled (HTTP call will fallback to auto-dispatch/heuristic)
        var workflowService = new AgentWorkflowService(
            db,
            mockHttpFactory.Object,
            mockInvoiceService.Object,
            mockLogger.Object,
            notificationService: null,
            availabilityService: null);

        // Act
        var workflow = await workflowService.DispatchWorkflowAsync(jobRequest);

        // Assert (Seam 2)
        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.JobRequestId == jobRequest.Id);
        Assert.NotNull(booking);
        Assert.Equal(BookingType.InstantMatch, booking.BookingType);
        Assert.NotNull(booking.ExpiresAt);

        // Instant match expiration should be ~90 seconds
        var ttl = booking.ExpiresAt.Value - booking.CreatedAt;
        Assert.True(ttl.TotalSeconds >= 80 && ttl.TotalSeconds <= 100,
            $"Expected ~90s TTL, but was {ttl.TotalSeconds} seconds.");
    }

    [Fact]
    public async Task GetByIdAsync_SurfacesBookingTypeAndExpirationFields()
    {
        // Arrange
        var (db, listing, customerId, providerId) = await SeedListingAndProviderAsync();
        var expires = DateTimeOffset.UtcNow.AddMinutes(30);

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            ServiceListingId = listing.Id,
            CustomerId = customerId,
            ProviderId = providerId,
            Status = BookingStatus.Requested,
            BookingType = BookingType.Scheduled,
            ExpiresAt = expires,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var bookingService = new BookingService(db);

        // Act
        var dto = await bookingService.GetByIdAsync(booking.Id, customerId, isRequesterAdmin: false);

        // Assert (Seam 3)
        Assert.NotNull(dto);
        Assert.Equal("Scheduled", dto.BookingType);
        Assert.Equal(expires, dto.ExpiresAt);
        Assert.True(dto.RemainingSeconds > 0 && dto.RemainingSeconds <= 1800);
    }

    [Fact]
    public void BookingStatus_IncludesExpiredAndDeclined()
    {
        // Assert (Seam 3)
        Assert.True(Enum.IsDefined(typeof(BookingStatus), "Expired"));
        Assert.True(Enum.IsDefined(typeof(BookingStatus), "Declined"));
    }

    [Fact]
    public async Task GetProviderQueries_PopulatesRelationalProjections_ForBothInflowTypes()
    {
        // Arrange
        var (db, listing, customerId, providerId) = await SeedListingAndProviderAsync();

        // 1. Instant Match Booking
        var jobRequest = new JobRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ServiceCategoryId = listing.ServiceCategoryId,
            Description = "Urgent ceiling pipe leak",
            Location = "Colombo 03",
            Urgency = JobUrgency.High,
            Status = JobRequestStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.JobRequests.Add(jobRequest);

        var instantBooking = new Booking
        {
            Id = Guid.NewGuid(),
            JobRequestId = jobRequest.Id,
            CustomerId = customerId,
            ProviderId = providerId,
            Status = BookingStatus.Requested,
            BookingType = BookingType.InstantMatch,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(90),
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Bookings.Add(instantBooking);

        // 2. Scheduled Request Booking
        var scheduledBooking = new Booking
        {
            Id = Guid.NewGuid(),
            ServiceListingId = listing.Id,
            CustomerId = customerId,
            ProviderId = providerId,
            Status = BookingStatus.Requested,
            BookingType = BookingType.Scheduled,
            ScheduledAt = DateTimeOffset.UtcNow.AddDays(1),
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(24),
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Bookings.Add(scheduledBooking);
        await db.SaveChangesAsync();

        var bookingService = new BookingService(db);

        // Act
        var instantOffers = await bookingService.GetProviderInstantOffersAsync(providerId);
        var scheduledRequests = await bookingService.GetProviderScheduledRequestsAsync(providerId);

        // Assert
        var instant = Assert.Single(instantOffers);
        Assert.Equal("InstantMatch", instant.BookingType);
        Assert.Equal("Plumbing", instant.Category);
        Assert.Equal("Urgent ceiling pipe leak", instant.Description);
        Assert.Equal("Jane Customer", instant.CustomerName);

        var scheduled = Assert.Single(scheduledRequests);
        Assert.Equal("Scheduled", scheduled.BookingType);
        Assert.Equal("Plumbing", scheduled.Category);
        Assert.Equal("Emergency Pipe Leak Repair", scheduled.Description);
        Assert.Equal("Jane Customer", scheduled.CustomerName);
    }
}
