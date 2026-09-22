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
    [Range(0.01, 1000000.0)]
    public decimal FixedPrice { get; set; }

    [Required]
    public TimeSpan EstimatedDuration { get; set; }
}
