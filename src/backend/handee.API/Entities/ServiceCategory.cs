namespace handee.API.Entities;

public class ServiceCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = default!;

    public decimal? PriceBandMin { get; set; }
    public decimal? PriceBandMax { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
}
