using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public class UpdateProfileDto
{
    [MaxLength(100)]
    public string? FullName { get; set; }

    [Phone]
    public string? PhoneNumber { get; set; }

    [Url]
    public string? ProfilePictureUrl { get; set; }
}
