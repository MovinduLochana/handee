using Microsoft.AspNetCore.Identity;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UserService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<UserProfileResult> GetProfileAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        var roles = await _userManager.GetRolesAsync(user);

        return new UserProfileResult(
            user.Id,
            user.FullName,
            user.Email,
            user.PhoneNumber,
            user.ProfilePictureUrl,
            user.IsActive,
            user.ProviderVerificationStatus.ToString(),
            user.CreatedAt,
            roles
        );
    }

    public async Task UpdateProfileAsync(string userId, UpdateProfileDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        if (dto.FullName is not null)          user.FullName          = dto.FullName;
        if (dto.PhoneNumber is not null)        user.PhoneNumber       = dto.PhoneNumber;
        if (dto.ProfilePictureUrl is not null)  user.ProfilePictureUrl = dto.ProfilePictureUrl;

        var result = await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            var errors = string.Join(" | ", result.Errors.Select(e => e.Description));
            throw new ValidationException(errors);
        }
    }
}
