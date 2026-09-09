namespace handee.API.DTO;

public record BookingResponseDto(
    Guid Id,
    Guid? JobRequestId,
    Guid? ServiceListingId,
    Guid ProviderId,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);
