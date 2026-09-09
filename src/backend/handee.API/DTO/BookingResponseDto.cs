namespace handee.API.DTO;

public record BookingResponseDto(
    Guid Id,
    Guid? JobRequestId,
    Guid? ServiceListingId,
    Guid ProviderId,
    Guid CustomerId,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);
