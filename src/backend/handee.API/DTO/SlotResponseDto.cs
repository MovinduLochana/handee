namespace handee.API.DTO;

public record SlotResponseDto(
    Guid Id,
    Guid ProviderId,
    DateTimeOffset StartTime,
    DateTimeOffset EndTime,
    bool IsBooked,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);
