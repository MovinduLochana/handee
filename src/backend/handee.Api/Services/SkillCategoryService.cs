using handee.API.Data;
using handee.API.DTO.SkillCategory;
using handee.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Services;

public class SkillCategoryService(AppDbContext db)
{
    // ─── List ─────────────────────────────────────────────────────────────

    public async Task<List<SkillCategoryResponseDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await db.SkillCategories
            .OrderBy(s => s.Name)
            .Select(s => new SkillCategoryResponseDto(s.Id, s.Name, s.IconUrl))
            .ToListAsync(ct);
    }

    // ─── Create ───────────────────────────────────────────────────────────

    public async Task<SkillCategoryResponseDto> CreateAsync(CreateSkillCategoryDto dto, CancellationToken ct = default)
    {
        if (await db.SkillCategories.AnyAsync(s => s.Name == dto.Name, ct))
            throw new InvalidOperationException($"A skill category named '{dto.Name}' already exists.");

        var category = new SkillCategory
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            IconUrl = dto.IconUrl
        };

        db.SkillCategories.Add(category);
        await db.SaveChangesAsync(ct);

        return new SkillCategoryResponseDto(category.Id, category.Name, category.IconUrl);
    }

    // ─── Update ───────────────────────────────────────────────────────────

    public async Task UpdateAsync(Guid id, UpdateSkillCategoryDto dto, CancellationToken ct = default)
    {
        var category = await db.SkillCategories.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"SkillCategory {id} not found.");

        if (await db.SkillCategories.AnyAsync(s => s.Name == dto.Name && s.Id != id, ct))
            throw new InvalidOperationException($"A skill category named '{dto.Name}' already exists.");

        category.Name = dto.Name;
        category.IconUrl = dto.IconUrl;
        await db.SaveChangesAsync(ct);
    }

    // ─── Delete ───────────────────────────────────────────────────────────

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var category = await db.SkillCategories
            .Include(s => s.Providers)
            .FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException($"SkillCategory {id} not found.");

        if (category.Providers.Count > 0)
            throw new InvalidOperationException(
                $"Cannot delete '{category.Name}' — {category.Providers.Count} provider(s) still reference it.");

        db.SkillCategories.Remove(category);
        await db.SaveChangesAsync(ct);
    }
}
