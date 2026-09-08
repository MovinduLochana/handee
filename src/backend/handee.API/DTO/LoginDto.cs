using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public class LoginDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = default!;

    [Required]
    public string Password { get; set; } = default!;
}