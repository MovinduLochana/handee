using handee.API.DTO.SkillCategory;
using handee.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace handee.API.Controllers;

[ApiController]
[Route("api/skill-categories")]
public class SkillCategoriesController(SkillCategoryService skillCategoryService) : ControllerBase
{
    // ─── GET /api/skill-categories ────────────────────────────────────────
    // Public — any caller can browse categories (needed for registration form)
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var categories = await skillCategoryService.GetAllAsync(ct);
        return Ok(categories);
    }

    // ─── POST /api/skill-categories ───────────────────────────────────────
    // Admin only — create a new skill category
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateSkillCategoryDto dto, CancellationToken ct)
    {
        try
        {
            var created = await skillCategoryService.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetAll), new { }, created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    // ─── PUT /api/skill-categories/{id} ──────────────────────────────────
    // Admin only — rename or update icon
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSkillCategoryDto dto, CancellationToken ct)
    {
        try
        {
            await skillCategoryService.UpdateAsync(id, dto, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    // ─── DELETE /api/skill-categories/{id} ───────────────────────────────
    // Admin only — safe delete (blocked if providers still reference it)
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await skillCategoryService.DeleteAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}
