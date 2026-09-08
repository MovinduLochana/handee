using Xunit;
using System.Security.Cryptography;
using System.Text;
using handee.API.Common;
using handee.API.Entities;
using Microsoft.Extensions.Options;

namespace handee.Tests.Auth;

public class RefreshTokenGeneratorTests
{
    private static RefreshTokenGenerator BuildGenerator(int expirationDays = 30)
    {
        var options = Options.Create(new AuthOptions
        {
            SecretKey = "test-secret-key",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            AccessTokenExpirationMinutes = 15,
            RefreshTokenExpirationDays = expirationDays
        });
        return new RefreshTokenGenerator(options);
    }

    private static string Sha256(string raw)
    {
        var bytes = Encoding.UTF8.GetBytes(raw);
        return Convert.ToBase64String(SHA256.HashData(bytes));
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public void GenerateRefreshToken_RawToken_DiffersFromStoredHash()
    {
        var generator = BuildGenerator();
        var userId = Guid.NewGuid();

        var (raw, entity) = generator.GenerateRefreshToken(userId);

        Assert.NotEqual(raw, entity.TokenHash);
    }

    [Fact]
    public void GenerateRefreshToken_StoredHash_IsSha256OfRawToken()
    {
        var generator = BuildGenerator();
        var userId = Guid.NewGuid();

        var (raw, entity) = generator.GenerateRefreshToken(userId);

        Assert.Equal(Sha256(raw), entity.TokenHash);
    }

    [Fact]
    public void GenerateRefreshToken_NoFamilyId_AssignsNewNonEmptyGuid()
    {
        var generator = BuildGenerator();
        var userId = Guid.NewGuid();

        var (_, entity) = generator.GenerateRefreshToken(userId);

        Assert.NotEqual(Guid.Empty, entity.FamilyId);
    }

    [Fact]
    public void GenerateRefreshToken_ExistingFamilyId_PreservesFamilyId()
    {
        var generator = BuildGenerator();
        var userId = Guid.NewGuid();
        var familyId = Guid.NewGuid();

        var (_, entity) = generator.GenerateRefreshToken(userId, familyId);

        Assert.Equal(familyId, entity.FamilyId);
    }

    [Fact]
    public void GenerateRefreshToken_Expiry_MatchesAuthOptionsDays()
    {
        var generator = BuildGenerator(expirationDays: 30);
        var userId = Guid.NewGuid();

        var before = DateTimeOffset.UtcNow;
        var (_, entity) = generator.GenerateRefreshToken(userId);
        var after = DateTimeOffset.UtcNow;

        Assert.True(entity.ExpiresAt >= before.AddDays(30));
        Assert.True(entity.ExpiresAt <= after.AddDays(30).AddSeconds(5));
    }

    [Fact]
    public void GenerateRefreshToken_UsedFlag_IsFalseByDefault()
    {
        var generator = BuildGenerator();

        var (_, entity) = generator.GenerateRefreshToken(Guid.NewGuid());

        Assert.False(entity.Used);
    }
}
