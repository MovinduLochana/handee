using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.AspNetCore.Identity;
using Moq;
using Xunit;

namespace handee.Tests.Providers;

public class AdminServiceTests
{
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly Mock<ICertificationRepository> _certRepoMock;
    private readonly AdminService _sut;

    public AdminServiceTests()
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _certRepoMock = new Mock<ICertificationRepository>();

        _sut = new AdminService(_userManagerMock.Object, _certRepoMock.Object);
    }

    // ── ReviewCertificationAsync ─────────────────────────────────────────────

    [Fact]
    public async Task ReviewCertification_Approve_Updates_Status()
    {
        // Arrange
        var cert = new Certification
        {
            Id = Guid.NewGuid(),
            ProviderProfileId = Guid.NewGuid(),
            Type = CertificationType.NIC,
            FileUrl = "https://example.com/nic.pdf",
            ReviewStatus = DocumentReviewStatus.Pending
        };

        _certRepoMock.Setup(r => r.GetByIdAsync(cert.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(cert);
        _certRepoMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        // Act
        await _sut.ReviewCertificationAsync(cert.Id, DocumentReviewStatus.Approved);

        // Assert
        Assert.Equal(DocumentReviewStatus.Approved, cert.ReviewStatus);
        _certRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ReviewCertification_Reject_Updates_Status()
    {
        // Arrange
        var cert = new Certification
        {
            Id = Guid.NewGuid(),
            ProviderProfileId = Guid.NewGuid(),
            Type = CertificationType.TradeCertification,
            FileUrl = "https://example.com/trade.pdf",
            ReviewStatus = DocumentReviewStatus.Pending
        };

        _certRepoMock.Setup(r => r.GetByIdAsync(cert.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(cert);
        _certRepoMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        // Act
        await _sut.ReviewCertificationAsync(cert.Id, DocumentReviewStatus.Rejected);

        // Assert
        Assert.Equal(DocumentReviewStatus.Rejected, cert.ReviewStatus);
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
            _sut.ReviewCertificationAsync(unknownId, DocumentReviewStatus.Approved));

        _certRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
