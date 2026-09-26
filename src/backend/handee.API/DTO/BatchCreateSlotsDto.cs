using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public class BatchCreateSlotsDto
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one slot must be provided.")]
    public List<CreateSlotDto> Slots { get; set; } = new();
}
