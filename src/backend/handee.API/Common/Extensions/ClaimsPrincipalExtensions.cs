using System.Security.Claims;

namespace handee.API.Common.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal? principal)
    {
        if (principal == null)
        {
            return null;
        }

        var claim = principal.FindFirstValue(ClaimTypes.NameIdentifier) 
                    ?? principal.FindFirstValue("sub");

        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
