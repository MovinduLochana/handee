using handee.API.Data;
using handee.API.DTO.ServiceListing;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.ServiceListings;

public class ServiceListingServiceTests
{
    private readonly AppDbContext _context;
    private readonly ServiceListingService _service;

    public ServiceListingServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _service = new ServiceListingService(_context);
    }

    [Fact]
    public async Task CreateListingAsync_WithValidData_ReturnsCreatedListing()
    {
        // Arrange
        var provider = new ApplicationUser { Id = Guid.NewGuid(), FullName = "Test Provider" };
        var category = new ServiceCategory { Id = Guid.NewGuid(), Name = "Handyman" };
        
        _context.Users.Add(provider);
        _context.ServiceCategories.Add(category);
        await _context.SaveChangesAsync();

        var dto = new CreateServiceListingDto
        {
            ServiceCategoryId = category.Id,
            Title = "Fix sinks",
            Description = "I fix sinks",
            FixedPrice = 50.00m,
            EstimatedDuration = TimeSpan.FromHours(1)
        };

        // Act
        var result = await _service.CreateListingAsync(provider.Id, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Fix sinks", result.Title);
        Assert.Equal(50.00m, result.FixedPrice);
        Assert.Equal(provider.Id, result.ProviderId);
        Assert.Equal(category.Id, result.ServiceCategoryId);
        
        var inDb = await _context.ServiceListings.FirstOrDefaultAsync();
        Assert.NotNull(inDb);
    }

    [Fact]
    public async Task CreateListingAsync_WithInvalidCategory_ThrowsNotFound()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var dto = new CreateServiceListingDto
        {
            ServiceCategoryId = Guid.NewGuid(),
            Title = "Fix sinks"
        };

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => _service.CreateListingAsync(providerId, dto));
    }
}
