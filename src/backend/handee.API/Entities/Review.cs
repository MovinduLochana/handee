namespace handee.API.Entities;

public class Review
{
    public Guid Id { get; set; }
    
    public Guid ProviderProfileId { get; set; }
    public ProviderProfile ProviderProfile { get; set; } = default!;

    public Guid CustomerId { get; set; }
    public ApplicationUser Customer { get; set; } = default!;

    public int Rating { get; set; }
    public string? Comment { get; set; }
    public List<string> PhotoUrls { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
}
