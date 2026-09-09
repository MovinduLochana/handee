using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using handee.API.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using handee.API.Interfaces;

namespace handee.API.Common;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly AuthOptions _options;

    public JwtTokenGenerator(IOptions<AuthOptions> options)
    {
        _options = options.Value;
    }

    public string GenerateAccessToken(
        ApplicationUser user,
        IEnumerable<string> roles,
        string? verificationStatus = null)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        if (verificationStatus != null)
        {
            claims.Add(
                new Claim("verificationStatus", verificationStatus)
            );
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_options.SecretKey)
        );

        var creds = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(
                _options.AccessTokenExpirationMinutes
            ),
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();

        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}
