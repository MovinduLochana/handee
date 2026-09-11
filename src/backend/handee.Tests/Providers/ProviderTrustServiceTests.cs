using handee.API.DTO.Provider;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace handee.Tests.Providers;

public class ProviderTrustServiceTests
{
    private readonly Mock<IProviderProfileRepository> _repoMock = new();
    private readonly Mock<IDistributedCache> _cacheMock = new();
    private readonly ProviderTrustService _sut;

    public ProviderTrustServiceTests()
    {
        // Cache always misses (returns null) by default
        _cacheMock.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync((byte[]?)null);
        _cacheMock.Setup(c => c.SetAsync(
                It.IsAny<string>(), It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _sut = new ProviderTrustService(
            _repoMock.Object,
            _cacheMock.Object,
            NullLogger<ProviderTrustService>.Instance);
    }

    private void SetupProfile(
        Guid profileId, VerificationStatus status,
        decimal rating = 4.5m, int reviewCount = 20, bool available = true,
        int ageDays = 180)
    {
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            FullName = "Test",
            UserName = "t@t.com",
            Email = "t@t.com",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-ageDays)
        };
        var profile = new ProviderProfile
        {
            Id = profileId,
            UserId = user.Id,
            User = user,
            VerificationStatus = status,
            RatingAggregate = rating,
            TotalReviewCount = reviewCount,
            IsAvailableForWork = available
        };
        _repoMock.Setup(r => r.GetByIdAsync(profileId, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(profile);
    }

    // ── Status-accuracy tests ────────────────────────────────────────────────

    [Fact]
    public async Task Verified_Provider_High_Rating_Returns_Verified()
    {
        var id = Guid.NewGuid();
        SetupProfile(id, VerificationStatus.Verified, rating: 4.8m);
        var result = await _sut.GetProviderTrustSignals(id);
        Assert.Equal(VerificationStatus.Verified, result.VerificationStatus);
    }

    [Fact]
    public async Task Verified_Provider_Low_Rating_Still_Returns_Verified_Status()
    {
        var id = Guid.NewGuid();
        SetupProfile(id, VerificationStatus.Verified, rating: 2.1m);
        var result = await _sut.GetProviderTrustSignals(id);
        Assert.Equal(VerificationStatus.Verified, result.VerificationStatus);
    }

    [Fact]
    public async Task Pending_Provider_Returns_Pending()
    {
        var id = Guid.NewGuid();
        SetupProfile(id, VerificationStatus.Pending);
        var result = await _sut.GetProviderTrustSignals(id);
        Assert.Equal(VerificationStatus.Pending, result.VerificationStatus);
    }

    [Fact]
    public async Task Rejected_Provider_Returns_Rejected()
    {
        var id = Guid.NewGuid();
        SetupProfile(id, VerificationStatus.Rejected);
        var result = await _sut.GetProviderTrustSignals(id);
        Assert.Equal(VerificationStatus.Rejected, result.VerificationStatus);
    }

    [Fact]
    public async Task InReview_Provider_Returns_InReview()
    {
        var id = Guid.NewGuid();
        SetupProfile(id, VerificationStatus.InReview);
        var result = await _sut.GetProviderTrustSignals(id);
        Assert.Equal(VerificationStatus.InReview, result.VerificationStatus);
    }

    // ── Critical safety invariant ────────────────────────────────────────────

    [Fact]
    public async Task Rejected_Provider_Must_Never_Return_Verified()
    {
        var id = Guid.NewGuid();
        SetupProfile(id, VerificationStatus.Rejected);
        var result = await _sut.GetProviderTrustSignals(id);
        Assert.NotEqual(VerificationStatus.Verified, result.VerificationStatus);
    }

    [Fact]
    public async Task Pending_Provider_Must_Never_Return_Verified()
    {
        var id = Guid.NewGuid();
        SetupProfile(id, VerificationStatus.Pending);
        var result = await _sut.GetProviderTrustSignals(id);
        Assert.NotEqual(VerificationStatus.Verified, result.VerificationStatus);
    }

    // ── Payload shape ────────────────────────────────────────────────────────

    [Fact]
    public async Task TrustSignal_Contains_Expected_Fields()
    {
        var id = Guid.NewGuid();
        SetupProfile(id, VerificationStatus.Verified, rating: 4.5m, reviewCount: 10, ageDays: 200);
        var result = await _sut.GetProviderTrustSignals(id);
        Assert.Equal(id, result.ProviderId);
        Assert.Equal(4.5m, result.RatingAggregate);
        Assert.Equal(10, result.TotalReviewCount);
        Assert.InRange(result.AccountAgeDays, 199, 201); // allow ±1 for test timing
    }

    // ── Missing profile ───────────────────────────────────────────────────────

    [Fact]
    public async Task Unknown_Profile_Should_Throw_KeyNotFound()
    {
        var unknownId = Guid.NewGuid();
        _repoMock.Setup(r => r.GetByIdAsync(unknownId, It.IsAny<CancellationToken>()))
                 .ReturnsAsync((ProviderProfile?)null);
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.GetProviderTrustSignals(unknownId));
    }
}
