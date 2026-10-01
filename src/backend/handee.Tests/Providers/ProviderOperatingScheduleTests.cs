using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.Providers;

public class ProviderOperatingScheduleTests
{
    private readonly AppDbContext _context;
    private readonly ProviderAvailabilityService _service;

    public ProviderOperatingScheduleTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _service = new ProviderAvailabilityService(_context);
    }

    [Fact]
    public async Task GetOperatingScheduleAsync_WhenNoScheduleConfigured_ReturnsDefaultMondayToFriday9To5()
    {
        var providerId = Guid.NewGuid();

        var result = await _service.GetOperatingScheduleAsync(providerId);

        Assert.NotNull(result);
        Assert.Equal(providerId, result.ProviderId);
        Assert.Equal(7, result.WeeklySchedule.Count);

        // Monday to Friday should be Active with 09:00 - 17:00
        var weekdays = new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday };
        foreach (var day in weekdays)
        {
            var daySchedule = result.WeeklySchedule.FirstOrDefault(s => s.DayOfWeek == day);
            Assert.NotNull(daySchedule);
            Assert.True(daySchedule.IsActive);
            Assert.Equal(new TimeSpan(9, 0, 0), daySchedule.StartTime);
            Assert.Equal(new TimeSpan(17, 0, 0), daySchedule.EndTime);
        }

        // Saturday and Sunday should be Inactive
        var weekends = new[] { DayOfWeek.Saturday, DayOfWeek.Sunday };
        foreach (var day in weekends)
        {
            var daySchedule = result.WeeklySchedule.FirstOrDefault(s => s.DayOfWeek == day);
            Assert.NotNull(daySchedule);
            Assert.False(daySchedule.IsActive);
        }
    }

    [Fact]
    public async Task UpdateOperatingScheduleAsync_WithValidSchedule_PersistsAndReturnsSchedule()
    {
        var providerId = Guid.NewGuid();

        var customSchedule = new List<DayOperatingScheduleDto>
        {
            new(DayOfWeek.Monday, new TimeSpan(8, 0, 0), new TimeSpan(16, 0, 0), true),
            new(DayOfWeek.Tuesday, new TimeSpan(8, 0, 0), new TimeSpan(16, 0, 0), true),
            new(DayOfWeek.Wednesday, new TimeSpan(8, 0, 0), new TimeSpan(16, 0, 0), true),
            new(DayOfWeek.Thursday, new TimeSpan(8, 0, 0), new TimeSpan(16, 0, 0), true),
            new(DayOfWeek.Friday, new TimeSpan(8, 0, 0), new TimeSpan(16, 0, 0), true),
            new(DayOfWeek.Saturday, new TimeSpan(10, 0, 0), new TimeSpan(14, 0, 0), true),
            new(DayOfWeek.Sunday, new TimeSpan(9, 0, 0), new TimeSpan(17, 0, 0), false)
        };

        var updateDto = new UpdateOperatingScheduleDto(customSchedule);

        var result = await _service.UpdateOperatingScheduleAsync(providerId, updateDto);

        Assert.NotNull(result);
        Assert.Equal(providerId, result.ProviderId);

        var monday = result.WeeklySchedule.First(s => s.DayOfWeek == DayOfWeek.Monday);
        Assert.True(monday.IsActive);
        Assert.Equal(new TimeSpan(8, 0, 0), monday.StartTime);
        Assert.Equal(new TimeSpan(16, 0, 0), monday.EndTime);

        var saturday = result.WeeklySchedule.First(s => s.DayOfWeek == DayOfWeek.Saturday);
        Assert.True(saturday.IsActive);
        Assert.Equal(new TimeSpan(10, 0, 0), saturday.StartTime);
        Assert.Equal(new TimeSpan(14, 0, 0), saturday.EndTime);

        var sunday = result.WeeklySchedule.First(s => s.DayOfWeek == DayOfWeek.Sunday);
        Assert.False(sunday.IsActive);

        // Verify retrieval matches
        var retrieved = await _service.GetOperatingScheduleAsync(providerId);
        var retrievedMon = retrieved.WeeklySchedule.First(s => s.DayOfWeek == DayOfWeek.Monday);
        Assert.Equal(new TimeSpan(8, 0, 0), retrievedMon.StartTime);
    }

    [Fact]
    public async Task UpdateOperatingScheduleAsync_WithEndTimeBeforeOrEqualStartTime_ThrowsValidationException()
    {
        var providerId = Guid.NewGuid();

        var invalidSchedule = new List<DayOperatingScheduleDto>
        {
            new(DayOfWeek.Monday, new TimeSpan(17, 0, 0), new TimeSpan(9, 0, 0), true) // End before Start!
        };

        var updateDto = new UpdateOperatingScheduleDto(invalidSchedule);

        await Assert.ThrowsAsync<ValidationException>(() => _service.UpdateOperatingScheduleAsync(providerId, updateDto));
    }
}
