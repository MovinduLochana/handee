using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO.SkillCategory;

/// <summary>Response body for a skill category.</summary>
public record SkillCategoryResponseDto(Guid Id, string Name, string? IconUrl);

/// <summary>POST /api/skill-categories — create a category.</summary>
public record CreateSkillCategoryDto(
    [Required, MaxLength(100)] string Name,
    [Url, MaxLength(500)] string? IconUrl);

/// <summary>PUT /api/skill-categories/{id} — rename / update icon.</summary>
public record UpdateSkillCategoryDto(
    [Required, MaxLength(100)] string Name,
    [Url, MaxLength(500)] string? IconUrl);
