using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public class RecurringScheduleDto
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one day of the week must be selected.")]
    public List<DayOfWeek> DaysOfWeek { get; set; } = new();

    [Required]
    public TimeSpan DailyStartTime { get; set; }

    [Required]
    public TimeSpan DailyEndTime { get; set; }

    [Range(15, 480, ErrorMessage = "Slot duration must be between 15 and 480 minutes.")]
    public int SlotDurationMinutes { get; set; } = 60;

    [Required]
    public DateTimeOffset StartDate { get; set; }

    [Required]
    public DateTimeOffset EndDate { get; set; }

    public int? TimeZoneOffsetMinutes { get; set; }
}
