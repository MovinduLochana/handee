namespace handee.API.DTO.ServiceListing;

public class ServiceListingResponseDto
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public Guid ServiceCategoryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public string Availability { get; set; } = string.Empty;
    public decimal FixedPrice { get; set; }
    public int DurationHours { get; set; } = 1;
    public TimeSpan EstimatedDuration { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    public string? ServiceCategoryName { get; set; }
    public string? ProviderFullName { get; set; }
}
