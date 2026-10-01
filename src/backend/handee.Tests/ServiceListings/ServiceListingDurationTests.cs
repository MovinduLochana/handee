using handee.API.Data;
using handee.API.DTO.ServiceListing;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.ServiceListings;

public class ServiceListingDurationTests
{
    private readonly AppDbContext _context;
    private readonly ServiceListingService _service;

    public ServiceListingDurationTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _service = new ServiceListingService(_context);
    }

    private async Task<(ApplicationUser Provider, ServiceCategory Category)> SeedProviderAndCategoryAsync()
    {
        var provider = new ApplicationUser { Id = Guid.NewGuid(), FullName = "Bob Provider" };
        var category = new ServiceCategory { Id = Guid.NewGuid(), Name = "Electrical" };

        _context.Users.Add(provider);
        _context.ServiceCategories.Add(category);
        await _context.SaveChangesAsync();

        return (provider, category);
    }

    [Fact]
    public async Task CreateListingAsync_WithValidDurationHours_PersistsIntegerHoursAndDuration()
    {
        var (provider, category) = await SeedProviderAndCategoryAsync();

        var dto = new CreateServiceListingDto
        {
            ServiceCategoryId = category.Id,
            Title = "Ceiling Fan Installation",
            Description = "Install new ceiling fan with standard wiring",
            Scope = "Includes mounting and wiring",
            Availability = "Mon-Fri 9AM-5PM",
            FixedPrice = 4500m,
            DurationHours = 2
        };

        var result = await _service.CreateListingAsync(provider.Id, dto);

        Assert.NotNull(result);
        Assert.Equal(2, result.DurationHours);
        Assert.Equal(TimeSpan.FromHours(2), result.EstimatedDuration);

        var persisted = await _context.ServiceListings.FindAsync(result.Id);
        Assert.NotNull(persisted);
        Assert.Equal(2, persisted.DurationHours);
        Assert.Equal(TimeSpan.FromHours(2), persisted.EstimatedDuration);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(9)]
    [InlineData(12)]
    public async Task CreateListingAsync_WithOutOfRangeDurationHours_ThrowsValidationException(int durationHours)
    {
        var (provider, category) = await SeedProviderAndCategoryAsync();

        var dto = new CreateServiceListingDto
        {
            ServiceCategoryId = category.Id,
            Title = "Invalid Duration Service",
            Description = "Testing boundary validation",
            Scope = "Scope",
            Availability = "Mon-Fri",
            FixedPrice = 3000m,
            DurationHours = durationHours
        };

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateListingAsync(provider.Id, dto));
    }

    [Fact]
    public async Task CreateListingAsync_WithLegacyEstimatedDuration_DerivesIntegerHours()
    {
        var (provider, category) = await SeedProviderAndCategoryAsync();

        var dto = new CreateServiceListingDto
        {
            ServiceCategoryId = category.Id,
            Title = "Legacy Duration Service",
            Description = "Testing legacy EstimatedDuration field",
            Scope = "Scope",
            Availability = "Mon-Fri",
            FixedPrice = 3000m,
            EstimatedDuration = TimeSpan.FromHours(3)
        };

        var result = await _service.CreateListingAsync(provider.Id, dto);

        Assert.Equal(3, result.DurationHours);
        Assert.Equal(TimeSpan.FromHours(3), result.EstimatedDuration);
    }

    [Fact]
    public async Task UpdateListingAsync_WithValidDurationHours_UpdatesBothFields()
    {
        var (provider, category) = await SeedProviderAndCategoryAsync();

        var created = await _service.CreateListingAsync(provider.Id, new CreateServiceListingDto
        {
            ServiceCategoryId = category.Id,
            Title = "Plumbing Diagnostic",
            Description = "Initial inspection",
            Scope = "Diagnostics only",
            Availability = "Weekdays",
            FixedPrice = 2500m,
            DurationHours = 1
        });

        var updateDto = new UpdateServiceListingDto
        {
            ServiceCategoryId = category.Id,
            Title = "Plumbing Diagnostic Extended",
            Description = "Comprehensive inspection",
            Scope = "Full line inspection",
            Availability = "Weekdays",
            FixedPrice = 5000m,
            DurationHours = 3,
            IsActive = true
        };

        var updated = await _service.UpdateListingAsync(created.Id, provider.Id, updateDto);

        Assert.Equal(3, updated.DurationHours);
        Assert.Equal(TimeSpan.FromHours(3), updated.EstimatedDuration);
    }

    [Fact]
    public async Task UpdateListingAsync_WithInvalidDurationHours_ThrowsValidationException()
    {
        var (provider, category) = await SeedProviderAndCategoryAsync();

        var created = await _service.CreateListingAsync(provider.Id, new CreateServiceListingDto
        {
            ServiceCategoryId = category.Id,
            Title = "Plumbing Diagnostic",
            Description = "Initial inspection",
            Scope = "Diagnostics only",
            Availability = "Weekdays",
            FixedPrice = 2500m,
            DurationHours = 1
        });

        var updateDto = new UpdateServiceListingDto
        {
            ServiceCategoryId = category.Id,
            Title = "Plumbing Diagnostic Extended",
            Description = "Comprehensive inspection",
            Scope = "Full line inspection",
            Availability = "Weekdays",
            FixedPrice = 5000m,
            DurationHours = 10,
            IsActive = true
        };

        await Assert.ThrowsAsync<ValidationException>(() => _service.UpdateListingAsync(created.Id, provider.Id, updateDto));
    }
}
