using handee.API.DTO;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IAdminService
{
    Task<IList<AdminUserResult>> GetUsersAsync();
    Task SetUserStatusAsync(Guid userId, bool isActive);
    Task SetVerificationStatusAsync(Guid userId, ProviderVerificationStatus status);
}
