using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO.ServiceListing;

public class CreateServiceListingDto
{
    [Required]
    public Guid ServiceCategoryId { get; set; }

    [Required]
    [StringLength(100)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [StringLength(500)]
    public string Scope { get; set; } = string.Empty;

    [StringLength(100)]
    public string Availability { get; set; } = "Available";

    [Required]
    [Range(0.01, 1000000.0)]
    public decimal FixedPrice { get; set; }

    [Range(1, 8, ErrorMessage = "Duration must be between 1 and 8 hours.")]
    public int DurationHours { get; set; } = 1;

    public TimeSpan EstimatedDuration
    {
        get => TimeSpan.FromHours(DurationHours > 0 ? DurationHours : 1);
        set => DurationHours = Math.Max(1, (int)Math.Round(value.TotalHours));
    }
}
