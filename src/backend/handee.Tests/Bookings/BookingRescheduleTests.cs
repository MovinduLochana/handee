using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.Bookings;

public class BookingRescheduleTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<(AppDbContext Db, Booking Booking, Guid CustomerId, Guid ProviderId, ServiceListing Listing)>
        SeedBookingWithListingAsync(int durationHours = 1)
    {
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        db.Users.Add(new ApplicationUser { Id = customerId, FullName = "Customer Alice" });
        db.Users.Add(new ApplicationUser { Id = providerId, FullName = "Provider Bob" });

        var category = new ServiceCategory { Name = "Plumbing" };
        db.ServiceCategories.Add(category);

        var listing = new ServiceListing
        {
            ProviderId = providerId,
            ServiceCategoryId = category.Id,
            Title = "Pipe Repair",
            Description = "Fix leaking pipes",
            Scope = "Standard pipe repair",
            FixedPrice = 5000,
            DurationHours = durationHours,
            IsActive = true
        };
        db.ServiceListings.Add(listing);

        // Schedule Mon-Fri 09:00 - 17:00, Sat-Sun Off
        foreach (DayOfWeek day in Enum.GetValues<DayOfWeek>())
        {
            bool isWeekday = day >= DayOfWeek.Monday && day <= DayOfWeek.Friday;
            db.ProviderOperatingSchedules.Add(new ProviderOperatingSchedule
            {
                ProviderId = providerId,
                DayOfWeek = day,
                StartTime = new TimeSpan(9, 0, 0),
                EndTime = new TimeSpan(17, 0, 0),
                IsActive = isWeekday
            });
        }

        var booking = new Booking
        {
            CustomerId = customerId,
            ProviderId = providerId,
            ServiceListingId = listing.Id,
            Status = BookingStatus.Requested,
            ScheduledAt = DateTimeOffset.UtcNow.AddDays(2).Date.AddHours(10) // 10:00 AM UTC
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        return (db, booking, customerId, providerId, listing);
    }

    private static DateTimeOffset GetNextWeekdayAtHour(int hourUtc)
    {
        var dt = DateTime.UtcNow.Date.AddDays(1);
        while (dt.DayOfWeek == DayOfWeek.Saturday || dt.DayOfWeek == DayOfWeek.Sunday)
        {
            dt = dt.AddDays(1);
        }
        return new DateTimeOffset(dt.Year, dt.Month, dt.Day, hourUtc, 0, 0, TimeSpan.Zero);
    }

    private static DateTimeOffset GetNextSundayAtHour(int hourUtc)
    {
        var dt = DateTime.UtcNow.Date.AddDays(1);
        while (dt.DayOfWeek != DayOfWeek.Sunday)
        {
            dt = dt.AddDays(1);
        }
        return new DateTimeOffset(dt.Year, dt.Month, dt.Day, hourUtc, 0, 0, TimeSpan.Zero);
    }

    [Fact]
    public async Task UpdateScheduleAsync_WhenRescheduledInThePast_ThrowsValidationException()
    {
        var (db, booking, customerId, _, _) = await SeedBookingWithListingAsync();
        var sut = new BookingService(db);

        var pastTime = DateTimeOffset.UtcNow.AddHours(-2);

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.UpdateScheduleAsync(booking.Id, new UpdateBookingScheduleDto(pastTime), customerId, false));

        Assert.Contains("future", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateScheduleAsync_WhenNotOnTheHour_ThrowsValidationException()
    {
        var (db, booking, customerId, _, _) = await SeedBookingWithListingAsync();
        var sut = new BookingService(db);

        var nextWeekday = GetNextWeekdayAtHour(10).AddMinutes(30); // 10:30

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.UpdateScheduleAsync(booking.Id, new UpdateBookingScheduleDto(nextWeekday), customerId, false));

        Assert.Contains("hour", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateScheduleAsync_WhenProviderNotWorkingOnThatDay_ThrowsValidationException()
    {
        var (db, booking, customerId, _, _) = await SeedBookingWithListingAsync();
        var sut = new BookingService(db);

        var sundayTime = GetNextSundayAtHour(10); // Provider is off on Sunday

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.UpdateScheduleAsync(booking.Id, new UpdateBookingScheduleDto(sundayTime), customerId, false));

        Assert.Contains("not available on this day", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateScheduleAsync_WhenOutsideOperatingHours_ThrowsValidationException()
    {
        var (db, booking, customerId, _, _) = await SeedBookingWithListingAsync(durationHours: 2);
        var sut = new BookingService(db);

        // Provider operates 09:00 - 17:00. Booking is 2 hours.
        // 16:00 to 18:00 exceeds daily end time 17:00!
        var lateWeekday = GetNextWeekdayAtHour(16);

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.UpdateScheduleAsync(booking.Id, new UpdateBookingScheduleDto(lateWeekday), customerId, false));

        Assert.Contains("outside the provider's operating hours", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateScheduleAsync_WhenCollidesWithAnotherActiveBooking_ThrowsValidationException()
    {
        var (db, booking, customerId, providerId, listing) = await SeedBookingWithListingAsync(durationHours: 1);
        var sut = new BookingService(db);

        var targetTime = GetNextWeekdayAtHour(11);

        // Seed another active booking on targetTime
        var existingBooking = new Booking
        {
            CustomerId = Guid.NewGuid(),
            ProviderId = providerId,
            ServiceListingId = listing.Id,
            Status = BookingStatus.Accepted,
            ScheduledAt = targetTime
        };
        db.Bookings.Add(existingBooking);
        await db.SaveChangesAsync();

        // Try to reschedule booking to 11:00
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            sut.UpdateScheduleAsync(booking.Id, new UpdateBookingScheduleDto(targetTime), customerId, false));

        Assert.Contains("active booking during the requested time slot", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateScheduleAsync_WhenValidAndConflictFree_SuccessfullyReschedules()
    {
        var (db, booking, customerId, _, _) = await SeedBookingWithListingAsync(durationHours: 2);
        var sut = new BookingService(db);

        var newTime = GetNextWeekdayAtHour(14); // 14:00 - 16:00, within 09:00 - 17:00

        var result = await sut.UpdateScheduleAsync(booking.Id, new UpdateBookingScheduleDto(newTime), customerId, false);

        Assert.Equal(newTime, result.ScheduledAt);
        Assert.NotNull(result.UpdatedAt);

        var updatedEntity = await db.Bookings.FindAsync(booking.Id);
        Assert.NotNull(updatedEntity);
        Assert.Equal(newTime, updatedEntity.ScheduledAt);
    }
}
