using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Services;

public class AdminService : IAdminService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<IList<AdminUserResult>> GetUsersAsync()
    {
        var users = await _userManager.Users.ToListAsync();

        var result = new List<AdminUserResult>(users.Count);

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(new AdminUserResult(
                user.Id,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                user.IsActive,
                user.ProviderVerificationStatus.ToString(),
                user.CreatedAt,
                roles
            ));
        }

        return result;
    }

    public async Task SetUserStatusAsync(Guid userId, bool isActive)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("User not found.");

        user.IsActive = isActive;

        await _userManager.UpdateAsync(user);
    }

    public async Task SetVerificationStatusAsync(Guid userId, ProviderVerificationStatus status)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("User not found.");

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains("Provider"))
            throw new ValidationException(
                "Verification status is only applicable to Provider-role users.");

        user.ProviderVerificationStatus = status;

        await _userManager.UpdateAsync(user);
    }
}
