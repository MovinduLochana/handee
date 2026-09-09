using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public class RegisterDto
{
    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = default!;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = default!;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = default!;

    /// <summary>Accepted values: "Customer" or "Provider"</summary>
    [Required]
    [RegularExpression("^(Customer|Provider)$",
        ErrorMessage = "Role must be either 'Customer' or 'Provider'.")]
    public string Role { get; set; } = default!;
}
