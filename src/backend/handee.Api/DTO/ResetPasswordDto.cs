using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public class ResetPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$", 
        ErrorMessage = "Password must have at least one uppercase, one lowercase, one number and one special character.")]
    public string NewPassword { get; set; } = string.Empty;
}
