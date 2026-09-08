using Xunit;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using handee.API.Common;
using handee.API.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace handee.Tests.Auth;

public class JwtTokenGeneratorTests
{
    private static JwtTokenGenerator BuildGenerator(
        int expirationMinutes = 15,
        string secretKey = "test-secret-key-that-is-long-enough-32chars",
        string issuer = "TestIssuer",
        string audience = "TestAudience")
    {
        var options = Options.Create(new AuthOptions
        {
            SecretKey = secretKey,
            Issuer = issuer,
            Audience = audience,
            AccessTokenExpirationMinutes = expirationMinutes,
            RefreshTokenExpirationDays = 30
        });
        return new JwtTokenGenerator(options);
    }

    private static JwtSecurityToken Decode(string token)
        => new JwtSecurityTokenHandler().ReadJwtToken(token);

    // ── Helper: validate token signature ─────────────────────────────────────

    private static ClaimsPrincipal Validate(string token, AuthOptions opts)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opts.SecretKey));
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = opts.Issuer,
            ValidAudience = opts.Audience,
            IssuerSigningKey = key,
            ClockSkew = TimeSpan.Zero
        };
        return new JwtSecurityTokenHandler().ValidateToken(token, parameters, out _);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public void GenerateAccessToken_CustomerUser_ContainsCorrectClaims()
    {
        var generator = BuildGenerator();
        var user = new ApplicationUser { Id = Guid.NewGuid(), Email = "alice@example.com", FullName = "Alice" };
        var roles = new[] { "Customer" };

        var token = generator.GenerateAccessToken(user, roles);
        var decoded = Decode(token);

        // ReadJwtToken keeps raw short claim names, not the mapped ClaimTypes.* URIs
        Assert.Contains(decoded.Claims, c => c.Type == "sub" && c.Value == user.Id.ToString());
        Assert.Contains(decoded.Claims, c => c.Type == "email" && c.Value == user.Email);
        Assert.NotNull(decoded.Id); // jti
        Assert.Contains(decoded.Claims, c => c.Type == "role" && c.Value == "Customer");
        Assert.DoesNotContain(decoded.Claims, c => c.Type == "verificationStatus");
    }

    [Fact]
    public void GenerateAccessToken_ProviderUser_ContainsVerificationStatusClaim()
    {
        var generator = BuildGenerator();
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            FullName = "Bob",
            ProviderVerificationStatus = ProviderVerificationStatus.Pending
        };
        var roles = new[] { "Provider" };

        var token = generator.GenerateAccessToken(user, roles, "Pending");
        var decoded = Decode(token);

        var statusClaim = decoded.Claims.FirstOrDefault(c => c.Type == "verificationStatus");
        Assert.NotNull(statusClaim);
        Assert.Equal("Pending", statusClaim!.Value);
    }

    [Fact]
    public void GenerateAccessToken_Expiry_MatchesConfiguredMinutes()
    {
        var generator = BuildGenerator(expirationMinutes: 30);
        var user = new ApplicationUser { Id = Guid.NewGuid(), FullName = "Alice" };

        var before = DateTime.UtcNow;
        var token = generator.GenerateAccessToken(user, new[] { "Customer" });
        var after = DateTime.UtcNow;

        var decoded = Decode(token);
        var exp = decoded.ValidTo; // UTC

        // Allow ±5s tolerance: JWT exp is seconds-precision and time passes between capture points
        Assert.True(exp >= before.AddMinutes(30).AddSeconds(-5));
        Assert.True(exp <= after.AddMinutes(30).AddSeconds(10));
    }

    [Fact]
    public void GenerateAccessToken_Signature_ValidatesWithCorrectKey()
    {
        var opts = new AuthOptions
        {
            SecretKey = "test-secret-key-that-is-long-enough-32chars",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            AccessTokenExpirationMinutes = 15
        };
        var generator = BuildGenerator(opts.AccessTokenExpirationMinutes, opts.SecretKey, opts.Issuer, opts.Audience);
        var user = new ApplicationUser { Id = Guid.NewGuid(), FullName = "Alice" };

        var token = generator.GenerateAccessToken(user, new[] { "Customer" });

        // Should not throw
        var principal = Validate(token, opts);
        Assert.NotNull(principal);
    }
}
