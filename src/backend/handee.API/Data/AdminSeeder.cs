using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using handee.API.Entities;

namespace handee.API.Data;

public static class AdminSeeder
{
    public static async Task SeedAdminAsync(
        UserManager<ApplicationUser> userManager,
        IConfiguration config)
    {
        var email    = config["Seeding:AdminEmail"]    ?? "admin@handee.lk";
        var password = config["Seeding:AdminPassword"] ?? "Admin@1234";

        // Idempotent: skip if an admin with this email already exists
        if (await userManager.FindByEmailAsync(email) != null)
            return;

        var admin = new ApplicationUser
        {
            FullName  = "System Admin",
            Email     = email,
            UserName  = email,
            IsActive  = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var result = await userManager.CreateAsync(admin, password);

        if (!result.Succeeded)
        {
            var errors = string.Join(" | ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Admin seeding failed: {errors}");
        }

        await userManager.AddToRoleAsync(admin, "Admin");
    }
}
