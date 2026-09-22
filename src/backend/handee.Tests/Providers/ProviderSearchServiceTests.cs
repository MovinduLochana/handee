using handee.API.DTO;
using handee.API.DTO.Provider;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace handee.Tests.Providers;

public class ProviderSearchServiceTests
{
    private readonly Mock<IProviderProfileRepository> _profileRepoMock = new();

    /// <summary>
    /// Builds the SUT with only the dependencies that matter for SearchAsync.
    /// All other ctor args are null! — the search code path never touches them.
    /// </summary>
    private ProviderProfileService BuildSut() => new(
        _profileRepoMock.Object,
        certRepo: null!,
        storage: null!,
        maps: null!,
        verificationService: null!,
        db: null!,
        NullLogger<ProviderProfileService>.Instance);

    private static ProviderProfile MakeProfile() => new()
    {
        Id = Guid.NewGuid(),
        UserId = Guid.NewGuid(),
        VerificationStatus = VerificationStatus.Verified,
        IsAvailableForWork = true,
        SkillCategories = [],
        Certifications = [],
        AuditLogs = [],
        User = new ApplicationUser { FullName = "Test User" },
        CreatedAt = DateTimeOffset.UtcNow
    };

    // ── Test 1: first page returns the correct slice ──────────────────────────

    [Fact]
    public async Task Search_FirstPage_Returns_CorrectSlice()
    {
        var twoProfiles = Enumerable.Range(0, 2).Select(_ => MakeProfile()).ToList();

        _profileRepoMock
            .Setup(r => r.SearchAsync(null, null, null, null, 25, 0, 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync((twoProfiles, 5));  // 5 total, only 2 in this page

        var sut = BuildSut();
        PagedResult<ProviderProfileCustomerDto> result =
            await sut.SearchAsync(null, null, null, null, radiusKm: 25, skip: 0, take: 2);

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(5, result.TotalCount);
        Assert.Equal(1, result.Page);       // skip=0, take=2 → page 1
        Assert.Equal(2, result.PageSize);
    }

    // ── Test 2: page beyond total returns empty list ──────────────────────────

    [Fact]
    public async Task Search_PageBeyondTotal_Returns_EmptyItems()
    {
        _profileRepoMock
            .Setup(r => r.SearchAsync(null, null, null, null, 25, 5, 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<ProviderProfile>(), 2));  // 2 total, skip=5 → nothing

        var sut = BuildSut();
        var result = await sut.SearchAsync(null, null, null, null, radiusKm: 25, skip: 5, take: 5);

        Assert.Empty(result.Items);
        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Page);   // (5/5)+1 = 2
    }

    // ── Test 3: repo is called with exactly the take value passed by the caller ─

    [Fact]
    public async Task Search_PassesTakeToRepo_Correctly()
    {
        _profileRepoMock
            .Setup(r => r.SearchAsync(null, null, null, null, 25, 0, 100, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<ProviderProfile>(), 0));

        var sut = BuildSut();
        await sut.SearchAsync(null, null, null, null, radiusKm: 25, skip: 0, take: 100);

        // Verify the service forwarded take=100 unchanged to the repository
        _profileRepoMock.Verify(
            r => r.SearchAsync(null, null, null, null, 25, 0, 100, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
