using handee.API.DTO;
using Microsoft.AspNetCore.Http;

namespace handee.API.Interfaces;

public interface IUserService
{
    Task<UserProfileResult> GetProfileAsync(string userId);
    Task UpdateProfileAsync(string userId, UpdateProfileDto dto);
    Task<string> UploadPhotoAsync(string userId, IFormFile photo, CancellationToken ct = default);
}
