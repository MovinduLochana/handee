namespace handee.API.DTO;

public record BookingResponseDto(
    Guid Id,
    Guid? JobRequestId,
    Guid? ServiceListingId,
    Guid ProviderId,
    Guid CustomerId,
    string Status,
    DateTimeOffset? ScheduledAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    string? CustomerName = null,
    string? CustomerPhone = null,
    string? ProviderName = null,
    string? ServiceLocation = null,
    decimal? Price = null,
    string? Category = null,
    string? Description = null,
    string? Notes = null,
    int DurationHours = 1,
    string? BookingType = null,
    DateTimeOffset? ExpiresAt = null,
    int? RemainingSeconds = null
);
