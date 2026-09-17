using System.ComponentModel.DataAnnotations;
using handee.API.Entities;

namespace handee.API.DTO;

public class CreateJobRequestDto
{
    [Required]
    public Guid ServiceCategoryId { get; set; }

    [Required]
    [MaxLength(2000)]
    public string Description { get; set; } = default!;

    public List<string> PhotoUrls { get; set; } = new();

    [Required]
    [MaxLength(300)]
    public string Location { get; set; } = default!;

    public JobUrgency Urgency { get; set; } = JobUrgency.Medium;

    [Range(0, double.MaxValue)]
    public decimal? BudgetMin { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? BudgetMax { get; set; }
}
