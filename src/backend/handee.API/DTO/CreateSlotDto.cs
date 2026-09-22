using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public class CreateSlotDto
{
    [Required]
    public DateTimeOffset StartTime { get; set; }

    [Required]
    public DateTimeOffset EndTime { get; set; }
}
