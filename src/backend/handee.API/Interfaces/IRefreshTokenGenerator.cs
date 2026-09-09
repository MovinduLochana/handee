using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IRefreshTokenGenerator
{
    public (string rawToken, RefreshToken entity) GenerateRefreshToken(Guid userId, Guid? familyId = null);
}