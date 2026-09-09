using handee.API.DTO;

namespace handee.API.Interfaces;

public interface IUserService
{
    Task<UserProfileResult> GetProfileAsync(string userId);
    Task UpdateProfileAsync(string userId, UpdateProfileDto dto);
}
