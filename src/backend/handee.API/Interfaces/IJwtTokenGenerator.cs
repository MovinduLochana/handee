using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IJwtTokenGenerator
{
    public string GenerateAccessToken(ApplicationUser user, IEnumerable<string> roles, string? verificationStatus = null);
}