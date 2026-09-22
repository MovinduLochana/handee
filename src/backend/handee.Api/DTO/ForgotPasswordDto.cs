using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public class ForgotPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
