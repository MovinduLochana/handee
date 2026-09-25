using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public record CreateListingBookingDto(
    [Required] Guid ServiceListingId,
    [Required] DateTimeOffset ScheduledAt,
    string? Notes = null
);

public record BookListingRequestDto(
    [Required] DateTimeOffset ScheduledAt,
    string? Notes = null
);
