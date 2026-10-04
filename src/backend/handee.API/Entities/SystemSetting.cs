namespace handee.API.Entities;

public class SystemSetting
{
    public string Key { get; set; } = default!;
    public string ValueJson { get; set; } = default!;
    public string Description { get; set; } = default!;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
