namespace handee.API.Entities;

public class ProviderOperatingSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; } = new(9, 0, 0);
    public TimeSpan EndTime { get; set; } = new(17, 0, 0);
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public ApplicationUser Provider { get; set; } = default!;
}
