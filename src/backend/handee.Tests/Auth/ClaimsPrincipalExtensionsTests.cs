using System.Security.Claims;
using handee.API.Common.Extensions;
using Xunit;

namespace handee.Tests.Auth;

public class ClaimsPrincipalExtensionsTests
{
    [Fact]
    public void GetUserId_ReturnsGuid_WhenNameIdentifierClaimExists()
    {
        var expectedId = Guid.NewGuid();
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, expectedId.ToString())
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));

        var result = principal.GetUserId();

        Assert.NotNull(result);
        Assert.Equal(expectedId, result.Value);
    }

    [Fact]
    public void GetUserId_ReturnsGuid_WhenSubClaimExists()
    {
        var expectedId = Guid.NewGuid();
        var claims = new[]
        {
            new Claim("sub", expectedId.ToString())
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));

        var result = principal.GetUserId();

        Assert.NotNull(result);
        Assert.Equal(expectedId, result.Value);
    }

    [Fact]
    public void GetUserId_ReturnsNull_WhenNoIdClaimExists()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.Email, "test@example.com")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));

        var result = principal.GetUserId();

        Assert.Null(result);
    }

    [Fact]
    public void GetUserId_ReturnsNull_WhenClaimIsNotValidGuid()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "not-a-valid-guid")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));

        var result = principal.GetUserId();

        Assert.Null(result);
    }

    [Fact]
    public void GetUserId_ReturnsNull_WhenPrincipalIsNull()
    {
        ClaimsPrincipal? principal = null;

        var result = principal.GetUserId();

        Assert.Null(result);
    }
}
