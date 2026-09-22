using handee.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Data;

// Same idempotent-check-then-create shape as RoleSeeder, invoked the same
// way at startup. Takes AppDbContext directly rather than an Identity
// manager, since ServiceCategory is a plain entity with no Identity-managed
// equivalent to RoleManager.
public static class ServiceCategorySeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        (string Name, decimal Min, decimal Max)[] categories =
        [
            ("Plumbing", 30m, 300m),
            ("Electrical", 40m, 400m),
            ("AC Repair", 50m, 500m),
            ("Painting", 100m, 1000m),
            ("General Maintenance", 25m, 250m),
            ("Cleaning", 20m, 200m),
        ];

        foreach (var (name, min, max) in categories)
        {
            var exists = await db.ServiceCategories.AnyAsync(c => c.Name == name);
            if (!exists)
            {
                db.ServiceCategories.Add(new ServiceCategory
                {
                    Name = name,
                    PriceBandMin = min,
                    PriceBandMax = max
                });
            }
        }

        await db.SaveChangesAsync();
    }
}
