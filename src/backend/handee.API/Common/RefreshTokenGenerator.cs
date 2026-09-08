using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace handee.API.Common;

public class RefreshTokenGenerator : IRefreshTokenGenerator
{
    private readonly AuthOptions _options;

    public RefreshTokenGenerator(IOptions<AuthOptions> options)
    {
        _options = options.Value;
    }

    public (string rawToken, RefreshToken entity) GenerateRefreshToken(Guid userId, Guid? familyId = null)
    {
        // 1. Generate 32 bytes of cryptographically strong random bytes
        var refreshTokenRaw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        // 2. Hash the raw token for secure database storage
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(refreshTokenRaw);
        var hashBytes = sha256.ComputeHash(bytes);
        var refreshTokenHash = Convert.ToBase64String(hashBytes);

        // 3. Construct the entity using strongly-typed AuthOptions
        var refreshTokenEntity = new RefreshToken
        {
            UserId    = userId,
            TokenHash = refreshTokenHash,
            FamilyId  = familyId ?? Guid.NewGuid(), // Start a new family if none provided
            IssuedAt  = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_options.RefreshTokenExpirationDays),
            Used      = false
        };

        // 4. Return both the raw unhashed token (for client) and entity (for DB)
        return (refreshTokenRaw, refreshTokenEntity);
    }
}