namespace handee.API.DTO;

public record DayOperatingScheduleDto(
    DayOfWeek DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime,
    bool IsActive
);

public record ProviderOperatingScheduleDto(
    Guid ProviderId,
    List<DayOperatingScheduleDto> WeeklySchedule
);

public record UpdateOperatingScheduleDto(
    List<DayOperatingScheduleDto> WeeklySchedule
);
