using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public class RefreshRequestDto
{
    [Required]
    public string RefreshToken { get; set; } = default!;
}