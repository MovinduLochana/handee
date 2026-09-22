using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using handee.API.Services;
using handee.API.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace handee.Tests.Providers;

public class AdminServiceTests
{
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly Mock<ICertificationRepository> _certRepoMock;
    private readonly Mock<IProviderProfileRepository> _providerRepoMock;
    private readonly AppDbContext _db;
    private readonly AdminService _sut;

    public AdminServiceTests()
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _certRepoMock = new Mock<ICertificationRepository>();
        _providerRepoMock = new Mock<IProviderProfileRepository>();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        _sut = new AdminService(_userManagerMock.Object, _certRepoMock.Object, _providerRepoMock.Object, _db);
    }

    // ── ReviewCertificationAsync ─────────────────────────────────────────────

    [Fact]
    public async Task ReviewCertification_Approve_Updates_Status_And_Creates_AuditLog()
    {
        // Arrange
        var adminId = Guid.NewGuid();
        var profile = new ProviderProfile
        {
            Id = Guid.NewGuid(),
            VerificationStatus = VerificationStatus.InReview
        };
        var cert = new Certification
        {
            Id = Guid.NewGuid(),
            ProviderProfileId = profile.Id,
            Type = CertificationType.NIC,
            OriginalFileName = "nic.pdf",
            ReviewStatus = DocumentReviewStatus.Pending
        };

        _providerRepoMock.Setup(r => r.GetByIdAsync(profile.Id, It.IsAny<CancellationToken>()))
                         .ReturnsAsync(profile);

        _certRepoMock.Setup(r => r.GetByIdAsync(cert.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(cert);
        _certRepoMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        // Act
        await _sut.ReviewCertificationAsync(cert.Id, adminId, DocumentReviewStatus.Approved);

        // Assert
        Assert.Equal(DocumentReviewStatus.Approved, cert.ReviewStatus);
        _certRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        
        var log = _db.VerificationAuditLogs.FirstOrDefault();
        Assert.NotNull(log);
        Assert.Equal(adminId, log!.AdminUserId);
        Assert.Equal(profile.Id, log.ProviderProfileId);
        Assert.Contains("Approved", log.Note);
    }

    [Fact]
    public async Task ReviewCertification_Reject_Updates_Status_And_Creates_AuditLog()
    {
        // Arrange
        var adminId = Guid.NewGuid();
        var profile = new ProviderProfile
        {
            Id = Guid.NewGuid(),
            VerificationStatus = VerificationStatus.InReview
        };
        var cert = new Certification
        {
            Id = Guid.NewGuid(),
            ProviderProfileId = profile.Id,
            Type = CertificationType.TradeCertification,
            FileUrl = "https://example.com/trade.pdf",
            ReviewStatus = DocumentReviewStatus.Pending
        };

        _providerRepoMock.Setup(r => r.GetByIdAsync(profile.Id, It.IsAny<CancellationToken>()))
                         .ReturnsAsync(profile);

        _certRepoMock.Setup(r => r.GetByIdAsync(cert.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(cert);
        _certRepoMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        // Act
        await _sut.ReviewCertificationAsync(cert.Id, adminId, DocumentReviewStatus.Rejected);

        // Assert
        Assert.Equal(DocumentReviewStatus.Rejected, cert.ReviewStatus);
        
        var log = _db.VerificationAuditLogs.FirstOrDefault();
        Assert.NotNull(log);
        Assert.Equal(adminId, log!.AdminUserId);
        Assert.Contains("Rejected", log.Note);
    }

    [Fact]
    public async Task ReviewCertification_UnknownId_Throws_NotFoundException()
    {
        // Arrange
        var unknownId = Guid.NewGuid();
        _certRepoMock.Setup(r => r.GetByIdAsync(unknownId, It.IsAny<CancellationToken>()))
                     .ReturnsAsync((Certification?)null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.ReviewCertificationAsync(unknownId, Guid.NewGuid(), DocumentReviewStatus.Approved));

        _certRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
