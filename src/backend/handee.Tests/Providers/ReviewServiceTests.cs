using handee.API.DTO.Review;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Services;
using Moq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Distributed;
using Xunit;

namespace handee.Tests.Providers;

public class ReviewServiceTests
{
    private readonly Mock<IReviewRepository> _mockReviewRepo;
    private readonly Mock<IProviderProfileRepository> _mockProfileRepo;
    private readonly Mock<IDistributedCache> _mockCache;
    private readonly Mock<ILogger<ProviderTrustService>> _mockLogger;
    private readonly Mock<IStorageService> _mockStorage;
    private readonly ProviderTrustService _trustService;
    private readonly ReviewService _reviewService;

    public ReviewServiceTests()
    {
        _mockReviewRepo = new Mock<IReviewRepository>();
        _mockProfileRepo = new Mock<IProviderProfileRepository>();
        _mockCache = new Mock<IDistributedCache>();
        _mockLogger = new Mock<ILogger<ProviderTrustService>>();
        _mockStorage = new Mock<IStorageService>();
        
        _trustService = new ProviderTrustService(_mockProfileRepo.Object, _mockCache.Object, _mockLogger.Object);
        _reviewService = new ReviewService(_mockReviewRepo.Object, _mockProfileRepo.Object, _trustService, _mockStorage.Object);
    }

    [Fact]
    public async Task AddReviewAsync_UpdatesProviderAggregate()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var dto = new CreateReviewDto(5, "Great job!");
        
        var profile = new ProviderProfile { Id = providerId, UserId = Guid.NewGuid() };
        
        _mockProfileRepo.Setup(r => r.GetByIdAsync(providerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);

        // First time, no review exists
        _mockReviewRepo.Setup(r => r.GetByCustomerAndProviderAsync(customerId, providerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Review?)null);

        // After we add this review, the aggregate should be re-fetched. Let's mock the aggregate return
        _mockReviewRepo.Setup(r => r.GetProviderRatingAggregateAsync(providerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((5.0m, 1));

        // Act
        var result = await _reviewService.AddReviewAsync(providerId, customerId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(5, result.Rating);
        Assert.Equal(5.0m, profile.RatingAggregate);
        Assert.Equal(1, profile.TotalReviewCount);
        
        // Verify repository interaction
        _mockReviewRepo.Verify(r => r.AddAsync(It.Is<Review>(rv => rv.Rating == 5), It.IsAny<CancellationToken>()), Times.Once);
        _mockProfileRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AddReviewAsync_ThrowsConflict_WhenReviewExists()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var dto = new CreateReviewDto(4, "Good");

        _mockProfileRepo.Setup(r => r.GetByIdAsync(providerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ProviderProfile());

        _mockReviewRepo.Setup(r => r.GetByCustomerAndProviderAsync(customerId, providerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Review()); // review already exists

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _reviewService.AddReviewAsync(providerId, customerId, dto));
    }
}
