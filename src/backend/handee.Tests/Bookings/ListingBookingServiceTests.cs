using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace handee.Tests.Bookings;

public class ListingBookingServiceTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<(AppDbContext Db, ServiceListing Listing, Guid CustomerId, Guid ProviderId)>
        SeedListingAsync(bool isActive = true, decimal fixedPrice = 5000m, TimeSpan? duration = null)
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
            Description = "Rapid repair of leaking pipes and joints",
            Scope = "Includes standard parts and labor",
            Availability = "Mon-Fri 9AM-5PM",
            FixedPrice = fixedPrice,
            DurationHours = duration.HasValue ? (int)Math.Max(1, duration.Value.TotalHours) : 2,
            EstimatedDuration = duration ?? TimeSpan.FromHours(2),
            IsActive = isActive,
            Provider = provider,
            Category = category
        };
        db.ServiceListings.Add(listing);

        // Ensure provider has active operating hours for all days 08:00 - 18:00
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

    private static DateTimeOffset UtcTime(int daysInFuture, int hour, int minute = 0)
    {
        var d = DateTime.UtcNow.Date.AddDays(daysInFuture);
        return new DateTimeOffset(d.Year, d.Month, d.Day, hour, minute, 0, TimeSpan.Zero);
    }

    private static DateTimeOffset NextDayUtc(DayOfWeek dayOfWeek, int hour, int minute = 0)
    {
        var d = DateTime.UtcNow.Date.AddDays(1);
        while (d.DayOfWeek != dayOfWeek)
        {
            d = d.AddDays(1);
        }
        return new DateTimeOffset(d.Year, d.Month, d.Day, hour, minute, 0, TimeSpan.Zero);
    }

    [Fact]
    public async Task CreateFromListingAsync_NonExistentListing_ThrowsNotFoundException()
    {
        var db = CreateContext();
        var sut = new BookingService(db);
        var dto = new CreateListingBookingDto(Guid.NewGuid(), UtcTime(1, 10));

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.CreateFromListingAsync(dto, Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateFromListingAsync_InactiveListing_ThrowsValidationException()
    {
        var (db, listing, customerId, _) = await SeedListingAsync(isActive: false);
        var sut = new BookingService(db);
        var dto = new CreateListingBookingDto(listing.Id, UtcTime(1, 10));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, customerId));
        Assert.Contains("active", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFromListingAsync_SelfBooking_ThrowsValidationException()
    {
        var (db, listing, _, providerId) = await SeedListingAsync(isActive: true);
        var sut = new BookingService(db);
        var dto = new CreateListingBookingDto(listing.Id, UtcTime(1, 10));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, providerId));
        Assert.Contains("own", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFromListingAsync_ScheduledInPast_ThrowsValidationException()
    {
        var (db, listing, customerId, _) = await SeedListingAsync(isActive: true);
        var sut = new BookingService(db);
        var dto = new CreateListingBookingDto(listing.Id, DateTimeOffset.UtcNow.AddDays(-1));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, customerId));
        Assert.Contains("future", ex.Message, StringComparison.OrdinalIgnoreCase);
    }



    [Fact]
    public async Task CreateFromListingAsync_NonTopOfHour_ThrowsValidationException()
    {
        var (db, listing, customerId, _) = await SeedListingAsync(isActive: true);
        var sut = new BookingService(db);

        var dto = new CreateListingBookingDto(listing.Id, UtcTime(1, 10, 15));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, customerId));
        Assert.Contains("hour", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFromListingAsync_OutsideOperatingHours_ThrowsValidationException()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(isActive: true, duration: TimeSpan.FromHours(2));
        var sut = new BookingService(db);

        // Set operating hours Monday 09:00 - 17:00
        var schedule = await db.ProviderOperatingSchedules
            .FirstAsync(s => s.ProviderId == providerId && s.DayOfWeek == DayOfWeek.Monday);
        schedule.StartTime = new TimeSpan(9, 0, 0);
        schedule.EndTime = new TimeSpan(17, 0, 0);
        schedule.IsActive = true;
        await db.SaveChangesAsync();

        // 2-hour job starting at 16:00 would finish at 18:00 (past 17:00 closing)
        var dto = new CreateListingBookingDto(listing.Id, NextDayUtc(DayOfWeek.Monday, 16));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, customerId));
        Assert.Contains("operating hours", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFromListingAsync_InactiveDay_ThrowsValidationException()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(isActive: true);
        var sut = new BookingService(db);

        var schedule = await db.ProviderOperatingSchedules
            .FirstAsync(s => s.ProviderId == providerId && s.DayOfWeek == DayOfWeek.Sunday);
        schedule.IsActive = false;
        await db.SaveChangesAsync();

        var dto = new CreateListingBookingDto(listing.Id, NextDayUtc(DayOfWeek.Sunday, 10));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, customerId));
        Assert.Contains("not available on this day", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFromListingAsync_OverlappingActiveBooking_ThrowsValidationException()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(isActive: true, duration: TimeSpan.FromHours(2));
        var sut = new BookingService(db);

        var scheduleTime = UtcTime(2, 10);

        // Provider already has an active booking from 10:00 to 12:00
        db.Bookings.Add(new Booking
        {
            ProviderId = providerId,
            CustomerId = Guid.NewGuid(),
            ServiceListingId = listing.Id,
            ScheduledAt = scheduleTime,
            Status = BookingStatus.Accepted
        });
        await db.SaveChangesAsync();

        // Customer tries to book at 11:00 (overlaps with 10:00 - 12:00)
        var dto = new CreateListingBookingDto(listing.Id, UtcTime(2, 11));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, customerId));
        Assert.Contains("booking", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFromListingAsync_ValidSlotAndNoCollisions_CreatesBookingAndInvoice()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(
            isActive: true, fixedPrice: 7500m, duration: TimeSpan.FromHours(2));
        var sut = new BookingService(db);

        var dto = new CreateListingBookingDto(
            listing.Id,
            UtcTime(1, 9),
            Notes: "Please bring metric pipe fittings."
        );

        var result = await sut.CreateFromListingAsync(dto, customerId);

        Assert.NotNull(result);
        Assert.Equal(listing.Id, result.ServiceListingId);
        Assert.Equal(providerId, result.ProviderId);
        Assert.Equal(customerId, result.CustomerId);
        Assert.Equal(BookingStatus.Requested.ToString(), result.Status);
        Assert.Equal(7500m, result.Price);
        Assert.Equal("Plumbing", result.Category);
        Assert.Equal("Please bring metric pipe fittings.", result.Notes);

        // Verify itemized invoice was created
        var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.BookingId == result.Id);
        Assert.NotNull(invoice);
        Assert.Equal(7500m, invoice.TotalAmount);
        Assert.Equal(InvoiceStatus.Issued, invoice.Status);
        Assert.Equal(QuoteApprovalStatus.AutoApproved, invoice.AdminApprovalStatus);
    }

    [Fact]
    public async Task CreateFromListingAsync_BookingAppearsInCustomerAndProviderQueues()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(isActive: true);
        var sut = new BookingService(db);

        var bookingTime = UtcTime(3, 10);
        var dto = new CreateListingBookingDto(listing.Id, bookingTime);

        var created = await sut.CreateFromListingAsync(dto, customerId);

        // Appears in customer's list
        var customerBookings = await sut.GetForCustomerAsync(customerId);
        Assert.Contains(customerBookings, b => b.Id == created.Id);

        // Appears in provider's scheduled requests (status Requested, type Scheduled)
        var providerRequests = await sut.GetProviderScheduledRequestsAsync(providerId);
        Assert.Contains(providerRequests, b => b.Id == created.Id);

        // Does NOT appear in provider's instant offers
        var providerOffers = await sut.GetProviderOffersAsync(providerId);
        Assert.DoesNotContain(providerOffers, b => b.Id == created.Id);

        var providerInstantOffers = await sut.GetProviderInstantOffersAsync(providerId);
        Assert.DoesNotContain(providerInstantOffers, b => b.Id == created.Id);

        // Appears in provider's all bookings
        var providerBookings = await sut.GetForProviderAsync(providerId);
        Assert.Contains(providerBookings, b => b.Id == created.Id);
    }

    [Fact]
    public async Task CreateFromListingAsync_Emits_RealTime_Notification_To_Provider()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(isActive: true);
        var mockNotificationService = new Mock<IBookingNotificationService>();
        var sut = new BookingService(db, new InvoiceService(db), mockNotificationService.Object);

        var bookingTime = UtcTime(3, 10);
        var dto = new CreateListingBookingDto(listing.Id, bookingTime);

        var created = await sut.CreateFromListingAsync(dto, customerId);

        mockNotificationService.Verify(
            n => n.NotifyScheduledBookingRequestedAsync(
                providerId,
                created.Id,
                listing.Category.Name,
                created.ScheduledAt!.Value,
                listing.FixedPrice,
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()),
            Times.Once);

        mockNotificationService.Verify(
            n => n.NotifyJobDispatchedAsync(
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid?>(),
                It.IsAny<string>(),
                It.IsAny<decimal?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }
      
    [Fact]  
    public async Task CreateFromListingAsync_ConvertsScheduledAtToUtc_NormalizesTime()
    {
        var (db, listing, customerId, _) = await SeedListingAsync(isActive: true);
        var sut = new BookingService(db);

        // Schedule at 2:30 PM with UTC+05:30 offset (which is 9:00 AM UTC)
        var offsetTime = new DateTimeOffset(2027, 6, 1, 14, 30, 0, TimeSpan.FromHours(5.5));
        var dto = new CreateListingBookingDto(listing.Id, offsetTime);

        var created = await sut.CreateFromListingAsync(dto, customerId);

        Assert.Equal(TimeSpan.Zero, created.ScheduledAt!.Value.Offset);
        Assert.Equal(9, created.ScheduledAt!.Value.Hour);
        Assert.Equal(0, created.ScheduledAt!.Value.Minute);
    }

    [Fact]
    public async Task CreateFromListingAsync_WhenListingExceedsSingleHour_CalculatesConflictIntervalCorrectly()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(
            isActive: true, fixedPrice: 5000m, duration: TimeSpan.FromHours(2));
        var sut = new BookingService(db);

        var firstBookingTime = UtcTime(1, 9);
        var dto1 = new CreateListingBookingDto(listing.Id, firstBookingTime);

        var result = await sut.CreateFromListingAsync(dto1, customerId);

        Assert.NotNull(result);
        Assert.Equal("Requested", result.Status);

        // A 2-hour job starting at 09:00 occupies [09:00, 11:00).
        // Attempting to book at 10:00 must fail due to overlap:
        var overlappingDto = new CreateListingBookingDto(listing.Id, UtcTime(1, 10));
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(overlappingDto, Guid.NewGuid()));
        Assert.Contains("active booking during the requested time slot", ex.Message, StringComparison.OrdinalIgnoreCase);

        // A job starting at 11:00 (immediately after) must succeed:
        var nonOverlappingDto = new CreateListingBookingDto(listing.Id, UtcTime(1, 11));
        var result2 = await sut.CreateFromListingAsync(nonOverlappingDto, Guid.NewGuid());
        Assert.NotNull(result2);
    }

    [Fact]
    public async Task CreateFromListingAsync_WithLocationAndCoordinates_PersistsAndReturnsLocation()
    {
        var (db, listing, customerId, _) = await SeedListingAsync(isActive: true);
        var sut = new BookingService(db);

        var dto = new CreateListingBookingDto(
            listing.Id,
            UtcTime(1, 10),
            Notes: "House behind temple",
            ServiceLocation: "No. 42, Galle Road, Colombo 03",
            Latitude: 6.9056,
            Longitude: 79.8622
        );

        var result = await sut.CreateFromListingAsync(dto, customerId);

        Assert.NotNull(result);
        Assert.Equal("No. 42, Galle Road, Colombo 03", result.ServiceLocation);
        Assert.Equal(6.9056, result.Latitude);
        Assert.Equal(79.8622, result.Longitude);

        // Verify persisted in DB
        var persisted = await db.Bookings.FindAsync(result.Id);
        Assert.NotNull(persisted);
        Assert.Equal("No. 42, Galle Road, Colombo 03", persisted.ServiceLocation);
        Assert.Equal(6.9056, persisted.Latitude);
        Assert.Equal(79.8622, persisted.Longitude);
    }
}
