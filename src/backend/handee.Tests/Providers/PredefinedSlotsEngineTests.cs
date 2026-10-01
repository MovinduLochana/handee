using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.Providers;

public class PredefinedSlotsEngineTests
{
    private readonly AppDbContext _context;
    private readonly ProviderAvailabilityService _service;

    public PredefinedSlotsEngineTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _service = new ProviderAvailabilityService(_context);
    }

    [Fact]
    public async Task GetPredefinedSlotsForDateAsync_NonWorkingDay_ReturnsIsWorkingDayFalseAndEmptySlots()
    {
        var providerId = Guid.NewGuid();

        // 2026-10-11 is a Sunday (DayOfWeek.Sunday)
        var sunday = new DateOnly(2026, 10, 11);
        Assert.Equal(DayOfWeek.Sunday, sunday.DayOfWeek);

        var result = await _service.GetPredefinedSlotsForDateAsync(providerId, sunday, durationHours: 1);

        Assert.NotNull(result);
        Assert.Equal(providerId, result.ProviderId);
        Assert.Equal(sunday, result.Date);
        Assert.False(result.IsWorkingDay);
        Assert.Empty(result.Slots);
    }

    [Fact]
    public async Task GetPredefinedSlotsForDateAsync_WorkingDayDefaultSchedule_GeneratesAllHourlySlots()
    {
        var providerId = Guid.NewGuid();

        // 2026-10-12 is a Monday (DayOfWeek.Monday) in the future
        var monday = new DateOnly(2026, 10, 12);
        Assert.Equal(DayOfWeek.Monday, monday.DayOfWeek);

        var result = await _service.GetPredefinedSlotsForDateAsync(providerId, monday, durationHours: 1);

        Assert.NotNull(result);
        Assert.True(result.IsWorkingDay);
        // Default Mon-Fri is 09:00 - 17:00 (8 one-hour slots: 9, 10, 11, 12, 13, 14, 15, 16)
        Assert.Equal(8, result.Slots.Count);
        Assert.All(result.Slots, s => Assert.True(s.IsAvailable));

        var firstSlot = result.Slots.First();
        Assert.Equal("09:00", firstSlot.SlotKey);
        Assert.Equal("09:00 AM - 10:00 AM", firstSlot.DisplayLabel);

        var lastSlot = result.Slots.Last();
        Assert.Equal("16:00", lastSlot.SlotKey);
        Assert.Equal("04:00 PM - 05:00 PM", lastSlot.DisplayLabel);
    }

    [Fact]
    public async Task GetPredefinedSlotsForDateAsync_MultiHourService_MarksSlotsNearClosingAsInsufficientTime()
    {
        var providerId = Guid.NewGuid();
        var monday = new DateOnly(2026, 10, 12);

        // 2-hour service: on a 09:00-17:00 day, 16:00 (4 PM) would end at 18:00 (6 PM), exceeding 17:00 closing!
        var result = await _service.GetPredefinedSlotsForDateAsync(providerId, monday, durationHours: 2);

        Assert.NotNull(result);
        Assert.True(result.IsWorkingDay);
        Assert.Equal(8, result.Slots.Count);

        // Slots 09:00 through 15:00 can accommodate 2 hours (09-11, 10-12, 11-13, 12-14, 13-15, 14-16, 15-17)
        for (int i = 0; i < 7; i++)
        {
            Assert.True(result.Slots[i].IsAvailable, $"Slot {result.Slots[i].SlotKey} should be available");
        }

        // Slot 16:00 cannot fit 2 hours before 17:00 closing
        var lastSlot = result.Slots.Last();
        Assert.Equal("16:00", lastSlot.SlotKey);
        Assert.False(lastSlot.IsAvailable);
        Assert.Equal("InsufficientTime", lastSlot.UnavailableReason);
    }

    [Fact]
    public async Task GetPredefinedSlotsForDateAsync_WithActiveBooking_MarksCollidingSingleAndMultiHourSlotsAsBooked()
    {
        var providerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var monday = new DateOnly(2026, 10, 12);

        var category = new ServiceCategory { Id = Guid.NewGuid(), Name = "Plumbing" };
        var listing = new ServiceListing
        {
            Id = Guid.NewGuid(),
            ProviderId = providerId,
            ServiceCategoryId = category.Id,
            Title = "Pipe Repair",
            DurationHours = 1,
            FixedPrice = 3000m,
            IsActive = true
        };
        _context.ServiceCategories.Add(category);
        _context.ServiceListings.Add(listing);

        // Create an existing booking from 11:00 AM to 12:00 PM on that Monday
        var bookingStart = new DateTimeOffset(2026, 10, 12, 11, 0, 0, TimeSpan.Zero);
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            ProviderId = providerId,
            CustomerId = customerId,
            ServiceListingId = listing.Id,
            ServiceListing = listing,
            ScheduledAt = bookingStart,
            Status = BookingStatus.Accepted
        };
        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        // 1. Single hour test (durationHours = 1): 11:00 slot is Booked, others available
        var result1Hr = await _service.GetPredefinedSlotsForDateAsync(providerId, monday, durationHours: 1);
        var slot11_1Hr = result1Hr.Slots.First(s => s.SlotKey == "11:00");
        Assert.False(slot11_1Hr.IsAvailable);
        Assert.Equal("Booked", slot11_1Hr.UnavailableReason);

        var slot10_1Hr = result1Hr.Slots.First(s => s.SlotKey == "10:00");
        Assert.True(slot10_1Hr.IsAvailable);

        // 2. Multi-hour test (durationHours = 2):
        // 10:00 slot would run 10:00 - 12:00, which collides with 11:00 - 12:00! So 10:00 must also be Booked!
        var result2Hr = await _service.GetPredefinedSlotsForDateAsync(providerId, monday, durationHours: 2);
        var slot10_2Hr = result2Hr.Slots.First(s => s.SlotKey == "10:00");
        Assert.False(slot10_2Hr.IsAvailable);
        Assert.Equal("Booked", slot10_2Hr.UnavailableReason);

        var slot09_2Hr = result2Hr.Slots.First(s => s.SlotKey == "09:00");
        Assert.True(slot09_2Hr.IsAvailable); // 09:00 - 11:00 is free!
    }
}
