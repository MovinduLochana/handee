namespace handee.API.Entities;

public class SkillCategory
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? IconUrl { get; set; }

    public ICollection<ProviderProfile> Providers { get; set; } = [];
}
