using handee.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Data;

public static class SkillCategorySeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.SkillCategories.AnyAsync())
        {
            // Already seeded
            return;
        }

        var defaultCategories = new List<SkillCategory>
        {
            new SkillCategory { Id = Guid.NewGuid(), Name = "Plumbing", IconUrl = null },
            new SkillCategory { Id = Guid.NewGuid(), Name = "Electrical", IconUrl = null },
            new SkillCategory { Id = Guid.NewGuid(), Name = "Carpentry", IconUrl = null },
            new SkillCategory { Id = Guid.NewGuid(), Name = "Cleaning", IconUrl = null },
            new SkillCategory { Id = Guid.NewGuid(), Name = "Landscaping", IconUrl = null },
            new SkillCategory { Id = Guid.NewGuid(), Name = "Painting", IconUrl = null },
            new SkillCategory { Id = Guid.NewGuid(), Name = "HVAC", IconUrl = null },
            new SkillCategory { Id = Guid.NewGuid(), Name = "Appliance Repair", IconUrl = null }
        };

        await context.SkillCategories.AddRangeAsync(defaultCategories);
        await context.SaveChangesAsync();
    }
}
