using System.Security.Claims;
using handee.API.Controllers;
using handee.API.DTO.Provider;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace handee.Tests.Providers;

public class ProviderControllerVerificationTests
{
    private readonly Mock<IProviderProfileService> _profileServiceMock = new();
    private readonly Mock<IVerificationService> _verificationServiceMock = new();
    private readonly Mock<IProviderTrustService> _trustServiceMock = new();
    private readonly Mock<IConfiguration> _configMock = new();

    private ProviderController CreateController(Guid? adminId = null)
    {
        var controller = new ProviderController(
            _profileServiceMock.Object,
            _verificationServiceMock.Object,
            _trustServiceMock.Object,
            _configMock.Object,
            NullLogger<ProviderController>.Instance);

        var claims = new List<Claim> { new(ClaimTypes.Role, "Admin") };
        if (adminId.HasValue && adminId.Value != Guid.Empty)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, adminId.Value.ToString()));
        }

        var identity = new ClaimsIdentity(claims, adminId.HasValue ? "TestAuth" : null);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        return controller;
    }

    [Fact]
    public async Task UpdateVerification_MissingAdminId_ReturnsUnauthorized()
    {
        var controller = CreateController(adminId: null);
        var dto = new VerificationActionDto(VerificationStatus.Verified, "Approved by admin");

        var result = await controller.UpdateVerification(Guid.NewGuid(), dto, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        _verificationServiceMock.Verify(
            s => s.TransitionAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<VerificationStatus>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateVerification_ValidAdminId_CallsTransitionAndInvalidatesCache()
    {
        var adminId = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var controller = CreateController(adminId: adminId);
        var dto = new VerificationActionDto(VerificationStatus.Verified, "Approved by admin");

        var result = await controller.UpdateVerification(profileId, dto, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        _verificationServiceMock.Verify(
            s => s.TransitionAsync(profileId, adminId, VerificationStatus.Verified, "Approved by admin", It.IsAny<CancellationToken>()),
            Times.Once);
        _trustServiceMock.Verify(
            s => s.InvalidateCacheAsync(profileId, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
