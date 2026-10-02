using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public record CreateListingBookingDto(
    [Required] Guid ServiceListingId,
    [Required] DateTimeOffset ScheduledAt,
    string? Notes = null,
    string? ServiceLocation = null,
    [Range(-90.0, 90.0, ErrorMessage = "Latitude must be between -90 and 90.")] double? Latitude = null,
    [Range(-180.0, 180.0, ErrorMessage = "Longitude must be between -180 and 180.")] double? Longitude = null
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if ((Latitude.HasValue && !Longitude.HasValue) || (!Latitude.HasValue && Longitude.HasValue))
        {
            yield return new ValidationResult(
                "Latitude and Longitude must both be provided or both be omitted.",
                [nameof(Latitude), nameof(Longitude)]);
        }

        if (Latitude.HasValue && (Latitude.Value < -90.0 || Latitude.Value > 90.0))
        {
            yield return new ValidationResult(
                "Latitude must be between -90 and 90.",
                [nameof(Latitude)]);
        }

        if (Longitude.HasValue && (Longitude.Value < -180.0 || Longitude.Value > 180.0))
        {
            yield return new ValidationResult(
                "Longitude must be between -180 and 180.",
                [nameof(Longitude)]);
        }
    }
}
