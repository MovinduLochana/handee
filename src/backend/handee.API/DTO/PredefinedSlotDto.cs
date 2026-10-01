namespace handee.API.DTO;

public record PredefinedSlotDto(
    string SlotKey,
    string DisplayLabel,
    DateTimeOffset StartTime,
    DateTimeOffset EndTime,
    bool IsAvailable,
    string? UnavailableReason
);

public record DailySlotsResponseDto(
    Guid ProviderId,
    DateOnly Date,
    int DurationHours,
    bool IsWorkingDay,
    List<PredefinedSlotDto> Slots
);
