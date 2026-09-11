using handee.API.Data;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace handee.Tests.Providers;

public class VerificationServiceTests
{
    private readonly AppDbContext _db;
    private readonly Mock<IProviderProfileRepository> _repoMock;
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly VerificationService _sut;

    public VerificationServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        _repoMock = new Mock<IProviderProfileRepository>();

        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _sut = new VerificationService(
            _repoMock.Object,
            _db,
            _userManagerMock.Object,
            NullLogger<VerificationService>.Instance);
    }

    private ProviderProfile BuildProfile(VerificationStatus status)
    {
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            FullName = "Test Provider",
            UserName = "provider@test.com",
            Email = "provider@test.com",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-30)
        };
        var profile = new ProviderProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            User = user,
            VerificationStatus = status
        };
        _db.Users.Add(user);
        _db.ProviderProfiles.Add(profile);
        _db.SaveChanges();
        _repoMock.Setup(r => r.GetByIdAsync(profile.Id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(profile);
        _repoMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);
        _userManagerMock.Setup(u => u.FindByIdAsync(user.Id.ToString())).ReturnsAsync(user);
        _userManagerMock.Setup(u => u.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);
        return profile;
    }

    // ── Legal transitions ────────────────────────────────────────────────────

    [Fact]
    public async Task Pending_To_InReview_Should_Succeed()
    {
        var profile = BuildProfile(VerificationStatus.Pending);
        await _sut.TransitionAsync(profile.Id, Guid.NewGuid(), VerificationStatus.InReview, null);
        Assert.Equal(VerificationStatus.InReview, profile.VerificationStatus);
    }

    [Fact]
    public async Task InReview_To_Verified_Should_Succeed_And_Write_AuditLog()
    {
        var profile = BuildProfile(VerificationStatus.InReview);
        var adminId = Guid.NewGuid();
        await _sut.TransitionAsync(profile.Id, adminId, VerificationStatus.Verified, "All docs OK");
        Assert.Equal(VerificationStatus.Verified, profile.VerificationStatus);
        // Audit log row should be in DB
        var log = _db.VerificationAuditLogs.FirstOrDefault(a => a.ProviderProfileId == profile.Id);
        Assert.NotNull(log);
        Assert.Equal(VerificationStatus.InReview, log!.PreviousStatus);
        Assert.Equal(VerificationStatus.Verified, log.NewStatus);
        Assert.Equal(adminId, log.AdminUserId);
    }

    [Fact]
    public async Task InReview_To_Rejected_Should_Succeed()
    {
        var profile = BuildProfile(VerificationStatus.InReview);
        await _sut.TransitionAsync(profile.Id, Guid.NewGuid(), VerificationStatus.Rejected, "NIC invalid");
        Assert.Equal(VerificationStatus.Rejected, profile.VerificationStatus);
    }

    [Fact]
    public async Task Rejected_Resubmit_Should_Move_To_Pending()
    {
        var profile = BuildProfile(VerificationStatus.Rejected);
        await _sut.ResubmitAsync(profile.Id);
        Assert.Equal(VerificationStatus.Pending, profile.VerificationStatus);
    }

    // ── Illegal transitions — must throw ─────────────────────────────────────

    [Fact]
    public async Task Rejected_To_Verified_Direct_Flip_Should_Throw()
    {
        var profile = BuildProfile(VerificationStatus.Rejected);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.TransitionAsync(profile.Id, Guid.NewGuid(), VerificationStatus.Verified, null));
    }

    [Fact]
    public async Task Pending_To_Verified_Skip_InReview_Should_Throw()
    {
        var profile = BuildProfile(VerificationStatus.Pending);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.TransitionAsync(profile.Id, Guid.NewGuid(), VerificationStatus.Verified, null));
    }

    [Fact]
    public async Task Verified_To_Pending_Direct_Should_Throw()
    {
        var profile = BuildProfile(VerificationStatus.Verified);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.TransitionAsync(profile.Id, Guid.NewGuid(), VerificationStatus.Pending, null));
    }

    [Fact]
    public async Task Resubmit_From_Pending_Should_Throw()
    {
        var profile = BuildProfile(VerificationStatus.Pending);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.ResubmitAsync(profile.Id));
    }

    // ── Missing profile ───────────────────────────────────────────────────────

    [Fact]
    public async Task Transition_Unknown_Profile_Should_Throw_KeyNotFound()
    {
        var unknownId = Guid.NewGuid();
        _repoMock.Setup(r => r.GetByIdAsync(unknownId, It.IsAny<CancellationToken>()))
                 .ReturnsAsync((ProviderProfile?)null);
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.TransitionAsync(unknownId, Guid.NewGuid(), VerificationStatus.InReview, null));
    }
}
