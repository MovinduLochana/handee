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
            EstimatedDuration = duration ?? TimeSpan.FromHours(2),
            IsActive = isActive,
            Provider = provider,
            Category = category
        };
        db.ServiceListings.Add(listing);
        await db.SaveChangesAsync();

        return (db, listing, customerId, providerId);
    }

    [Fact]
    public async Task CreateFromListingAsync_NonExistentListing_ThrowsNotFoundException()
    {
        var db = CreateContext();
        var sut = new BookingService(db);
        var dto = new CreateListingBookingDto(Guid.NewGuid(), DateTimeOffset.UtcNow.AddDays(1));

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.CreateFromListingAsync(dto, Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateFromListingAsync_InactiveListing_ThrowsValidationException()
    {
        var (db, listing, customerId, _) = await SeedListingAsync(isActive: false);
        var sut = new BookingService(db);
        var dto = new CreateListingBookingDto(listing.Id, DateTimeOffset.UtcNow.AddDays(1));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, customerId));
        Assert.Contains("active", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFromListingAsync_SelfBooking_ThrowsValidationException()
    {
        var (db, listing, _, providerId) = await SeedListingAsync(isActive: true);
        var sut = new BookingService(db);
        var dto = new CreateListingBookingDto(listing.Id, DateTimeOffset.UtcNow.AddDays(1));

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
    public async Task CreateFromListingAsync_ProviderHasSlots_WhenRequestedTimeOutsideSlots_ThrowsValidationException()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(isActive: true);
        var sut = new BookingService(db);

        // Add a slot for tomorrow 9 AM - 11 AM
        var tomorrow = DateTimeOffset.UtcNow.Date.AddDays(1);
        db.ProviderAvailabilitySlots.Add(new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = tomorrow.AddHours(9),
            EndTime = tomorrow.AddHours(11),
            IsBooked = false
        });
        await db.SaveChangesAsync();

        // Customer requests 2 PM (outside the configured slot)
        var dto = new CreateListingBookingDto(listing.Id, tomorrow.AddHours(14));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, customerId));
        Assert.Contains("not available", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFromListingAsync_OverlappingActiveBooking_ThrowsValidationException()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(isActive: true, duration: TimeSpan.FromHours(2));
        var sut = new BookingService(db);

        var scheduleTime = DateTimeOffset.UtcNow.AddDays(2);

        // Provider already has an active booking at scheduleTime
        db.Bookings.Add(new Booking
        {
            ProviderId = providerId,
            CustomerId = Guid.NewGuid(),
            ServiceListingId = listing.Id,
            ScheduledAt = scheduleTime,
            Status = BookingStatus.Accepted
        });
        await db.SaveChangesAsync();

        // Customer tries to book an overlapping slot (scheduleTime + 30 mins, duration is 2h)
        var dto = new CreateListingBookingDto(listing.Id, scheduleTime.AddMinutes(30));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.CreateFromListingAsync(dto, customerId));
        Assert.Contains("booking", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFromListingAsync_ValidActiveSlotAndNoCollisions_CreatesBookingAndInvoice()
    {
        var (db, listing, customerId, providerId) = await SeedListingAsync(
            isActive: true, fixedPrice: 7500m, duration: TimeSpan.FromHours(2));
        var sut = new BookingService(db);

        var tomorrow = DateTimeOffset.UtcNow.Date.AddDays(1);
        var slot = new ProviderAvailabilitySlot
        {
            ProviderId = providerId,
            StartTime = tomorrow.AddHours(9),
            EndTime = tomorrow.AddHours(12),
            IsBooked = false
        };
        db.ProviderAvailabilitySlots.Add(slot);
        await db.SaveChangesAsync();

        var dto = new CreateListingBookingDto(
            listing.Id,
            tomorrow.AddHours(9),
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

        // Verify slot was marked booked
        var updatedSlot = await db.ProviderAvailabilitySlots.FindAsync(slot.Id);
        Assert.True(updatedSlot!.IsBooked);

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

        var bookingTime = DateTimeOffset.UtcNow.AddDays(3);
        var dto = new CreateListingBookingDto(listing.Id, bookingTime);

        var created = await sut.CreateFromListingAsync(dto, customerId);

        // Appears in customer's list
        var customerBookings = await sut.GetForCustomerAsync(customerId);
        Assert.Contains(customerBookings, b => b.Id == created.Id);

        // Appears in provider's offers (since status is Requested)
        var providerOffers = await sut.GetProviderOffersAsync(providerId);
        Assert.Contains(providerOffers, b => b.Id == created.Id);

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

        var bookingTime = DateTimeOffset.UtcNow.AddDays(3);
        var dto = new CreateListingBookingDto(listing.Id, bookingTime);

        var created = await sut.CreateFromListingAsync(dto, customerId);

        mockNotificationService.Verify(
            n => n.NotifyJobDispatchedAsync(
                providerId,
                created.Id,
                null,
                listing.Category.Name,
                listing.FixedPrice,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
