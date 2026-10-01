import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
  Smartphone,
  Copy,
  Info,
} from "lucide-react";
import { providerApi } from "../../api/providers";
import { providerAvailabilityApi } from "../../api/providerAvailability";
import type { DayOperatingScheduleDto, UpdateOperatingScheduleDto } from "../../api/types";

interface DayDef {
  dayIndex: number;
  dayName: string;
}

const DAYS_ORDER: DayDef[] = [
  { dayIndex: 1, dayName: "Monday" },
  { dayIndex: 2, dayName: "Tuesday" },
  { dayIndex: 3, dayName: "Wednesday" },
  { dayIndex: 4, dayName: "Thursday" },
  { dayIndex: 5, dayName: "Friday" },
  { dayIndex: 6, dayName: "Saturday" },
  { dayIndex: 0, dayName: "Sunday" },
];

interface DayScheduleRow {
  dayIndex: number;
  dayName: string;
  isActive: boolean;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

const DEFAULT_SCHEDULE: DayScheduleRow[] = DAYS_ORDER.map((d) => ({
  dayIndex: d.dayIndex,
  dayName: d.dayName,
  isActive: d.dayIndex >= 1 && d.dayIndex <= 5, // Mon-Fri active by default
  startTime: "09:00",
  endTime: "17:00",
}));

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  return hours * 60 + minutes;
}

function calculateSlots(startTime: string, endTime: string): number {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  const diff = endMins - startMins;
  if (diff <= 0) return 0;
  return Math.floor(diff / 60);
}

function normalizeTimeToHHmm(timeStr: string): string {
  if (!timeStr) return "09:00";
  // If format is "09:00:00", take first 5 chars
  return timeStr.slice(0, 5);
}

export default function ProviderAvailability() {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<DayScheduleRow[]>(DEFAULT_SCHEDULE);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // 1. Fetch current provider profile
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    error: profileError,
  } = useQuery({
    queryKey: ["myProfile"],
    queryFn: () => providerApi.getMyProfile(),
  });

  // 2. Fetch existing operating schedule once profile ID is available
  const {
    data: operatingScheduleData,
    isLoading: isLoadingSchedule,
    isError: isScheduleError,
    error: scheduleError,
  } = useQuery({
    queryKey: ["providerOperatingSchedule", profile?.id],
    queryFn: () => providerAvailabilityApi.getOperatingSchedule(profile!.id),
    enabled: !!profile?.id,
  });

  // Sync loaded schedule into local state
  useEffect(() => {
    if (operatingScheduleData?.weeklySchedule && operatingScheduleData.weeklySchedule.length > 0) {
      const incoming = operatingScheduleData.weeklySchedule;
      const merged = DAYS_ORDER.map((def) => {
        const found = incoming.find((item: DayOperatingScheduleDto) => {
          if (typeof item.dayOfWeek === "number") {
            return item.dayOfWeek === def.dayIndex;
          }
          return String(item.dayOfWeek).toLowerCase() === def.dayName.toLowerCase();
        });

        if (found) {
          return {
            dayIndex: def.dayIndex,
            dayName: def.dayName,
            isActive: found.isActive,
            startTime: normalizeTimeToHHmm(found.startTime),
            endTime: normalizeTimeToHHmm(found.endTime),
          };
        }
        return {
          dayIndex: def.dayIndex,
          dayName: def.dayName,
          isActive: def.dayIndex >= 1 && def.dayIndex <= 5,
          startTime: "09:00",
          endTime: "17:00",
        };
      });
      setSchedule(merged);
    }
  }, [operatingScheduleData]);

  // Update schedule mutation
  const saveMutation = useMutation({
    mutationFn: (dto: UpdateOperatingScheduleDto) =>
      providerAvailabilityApi.updateOperatingSchedule(dto),
    onSuccess: () => {
      setSaveSuccess(true);
      setFormError(null);
      if (profile?.id) {
        queryClient.invalidateQueries({
          queryKey: ["providerOperatingSchedule", profile.id],
        });
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err: any) => {
      setSaveSuccess(false);
      setFormError(
        err?.response?.data?.message ||
          err?.response?.data ||
          err?.message ||
          "Failed to save operating schedule. Please check your inputs.",
      );
    },
  });

  const handleToggleDay = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((row) => (row.dayIndex === dayIndex ? { ...row, isActive: !row.isActive } : row)),
    );
    setSaveSuccess(false);
    setFormError(null);
  };

  const handleTimeChange = (dayIndex: number, field: "startTime" | "endTime", value: string) => {
    setSchedule((prev) =>
      prev.map((row) => (row.dayIndex === dayIndex ? { ...row, [field]: value } : row)),
    );
    setSaveSuccess(false);
    setFormError(null);
  };

  // Presets
  const handleApplyWeekdaysPreset = () => {
    setSchedule(
      DAYS_ORDER.map((d) => ({
        dayIndex: d.dayIndex,
        dayName: d.dayName,
        isActive: d.dayIndex >= 1 && d.dayIndex <= 5,
        startTime: "09:00",
        endTime: "17:00",
      })),
    );
    setSaveSuccess(false);
    setFormError(null);
  };

  const handleApplyAllDaysPreset = () => {
    setSchedule(
      DAYS_ORDER.map((d) => ({
        dayIndex: d.dayIndex,
        dayName: d.dayName,
        isActive: true,
        startTime: "09:00",
        endTime: "17:00",
      })),
    );
    setSaveSuccess(false);
    setFormError(null);
  };

  const handleCopyToAllDays = (sourceDayIndex: number) => {
    const sourceRow = schedule.find((r) => r.dayIndex === sourceDayIndex);
    if (!sourceRow) return;

    setSchedule((prev) =>
      prev.map((row) => ({
        ...row,
        startTime: sourceRow.startTime,
        endTime: sourceRow.endTime,
      })),
    );
    setSaveSuccess(false);
    setFormError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaveSuccess(false);

    // Validation: Any active day must have endTime > startTime
    for (const row of schedule) {
      if (row.isActive) {
        const startMins = parseTimeToMinutes(row.startTime);
        const endMins = parseTimeToMinutes(row.endTime);
        if (endMins <= startMins) {
          setFormError(
            `${row.dayName}: Daily end time (${row.endTime}) must be later than start time (${row.startTime}).`,
          );
          return;
        }
      }
    }

    const payload: UpdateOperatingScheduleDto = {
      weeklySchedule: schedule.map((row) => ({
        dayOfWeek: row.dayIndex,
        startTime: row.startTime.length === 5 ? `${row.startTime}:00` : row.startTime,
        endTime: row.endTime.length === 5 ? `${row.endTime}:00` : row.endTime,
        isActive: row.isActive,
      })),
    };

    saveMutation.mutate(payload);
  };

  // Aggregated calculations
  const totalActiveDays = schedule.filter((r) => r.isActive).length;
  const totalWeeklySlots = schedule
    .filter((r) => r.isActive)
    .reduce((sum, r) => sum + calculateSlots(r.startTime, r.endTime), 0);

  const isLoading = isLoadingProfile || (profile?.id && isLoadingSchedule);
  const isError = isProfileError || isScheduleError;
  const currentError = profileError || scheduleError;

  return (
    <div className="availability-page animate-fade-up">
      <div className="availability-header">
        <div>
          <h1>Weekly Operating Schedule</h1>
          <p>
            Define your regular working days and daily hours. Handee automatically divides your
            schedule into 1-hour predefined booking slots for mobile clients.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saveMutation.isPending || isLoading}
          >
            <Save size={16} />
            {saveMutation.isPending ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </div>

      {/* Info notice about mobile app bookings */}
      <div className="schedule-info-banner">
        <Smartphone size={22} className="info-icon" />
        <div className="info-content">
          <div className="info-title">Simplified 1-Hour Predefined Slots</div>
          <div className="info-desc">
            Customers book your service listings directly through the{" "}
            <strong>Handee Mobile App</strong> by selecting available 1-hour time slots. Your
            service listings will reserve consecutive 1-hour blocks based on their duration.
          </div>
        </div>
      </div>

      {/* Summary and Preset Toolbar */}
      <div className="schedule-toolbar">
        <div className="summary-stats">
          <div className="stat-pill">
            <Calendar size={14} />
            <span>
              <strong>{totalActiveDays}</strong> Active Days
            </span>
          </div>
          <div className="stat-pill">
            <Clock size={14} />
            <span>
              <strong>{totalWeeklySlots}</strong> Bookable 1-Hr Slots / Week
            </span>
          </div>
        </div>

        <div className="presets-group">
          <span className="presets-label">Quick Presets:</span>
          <button
            type="button"
            className="preset-chip"
            onClick={handleApplyWeekdaysPreset}
            title="Mon–Fri 09:00 to 17:00, weekends off"
          >
            <Sparkles size={13} /> Mon–Fri (9 AM – 5 PM)
          </button>
          <button
            type="button"
            className="preset-chip"
            onClick={handleApplyAllDaysPreset}
            title="All 7 days 09:00 to 17:00"
          >
            All Days Active
          </button>
        </div>
      </div>

      {formError && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{formError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="success-banner">
          <CheckCircle2 size={18} />
          <span>Operating schedule successfully updated!</span>
        </div>
      )}

      {isLoading ? (
        <div className="state-container">Loading operating schedule...</div>
      ) : isError ? (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>
            Failed to load operating schedule:{" "}
            {(currentError as any)?.response?.data?.message ||
              (typeof (currentError as any)?.response?.data === "string"
                ? (currentError as any)?.response?.data
                : null) ||
              (currentError as any)?.message ||
              "Please ensure you are signed in with an active provider account."}
          </span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="schedule-card-list">
          {schedule.map((row) => {
            const slotsCount = calculateSlots(row.startTime, row.endTime);
            const isTimeValid = parseTimeToMinutes(row.endTime) > parseTimeToMinutes(row.startTime);

            return (
              <div
                key={row.dayIndex}
                className={`day-row-card ${row.isActive ? "active-day" : "inactive-day"}`}
              >
                <div className="day-info-section">
                  <div className="day-name-wrapper">
                    <span className="day-name">{row.dayName}</span>
                    <span className={`day-status-tag ${row.isActive ? "tag-working" : "tag-off"}`}>
                      {row.isActive ? "Working" : "Day Off"}
                    </span>
                  </div>

                  <label className="toggle-switch-container">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={() => handleToggleDay(row.dayIndex)}
                      aria-label={`Toggle ${row.dayName}`}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {row.isActive ? (
                  <div className="day-controls-section">
                    <div className="time-pickers-group">
                      <div className="time-field">
                        <label htmlFor={`start-time-${row.dayIndex}`}>Start Time</label>
                        <input
                          id={`start-time-${row.dayIndex}`}
                          type="time"
                          value={row.startTime}
                          onChange={(e) =>
                            handleTimeChange(row.dayIndex, "startTime", e.target.value)
                          }
                          required
                        />
                      </div>
                      <span className="time-separator">to</span>
                      <div className="time-field">
                        <label htmlFor={`end-time-${row.dayIndex}`}>End Time</label>
                        <input
                          id={`end-time-${row.dayIndex}`}
                          type="time"
                          value={row.endTime}
                          onChange={(e) =>
                            handleTimeChange(row.dayIndex, "endTime", e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="day-meta-section">
                      <div className={`slots-count-badge ${!isTimeValid ? "badge-invalid" : ""}`}>
                        <Clock size={13} />
                        {isTimeValid
                          ? `${slotsCount} bookable slot${slotsCount === 1 ? "" : "s"} (1 hr each)`
                          : "Invalid time range"}
                      </div>

                      <button
                        type="button"
                        className="btn-copy-hours"
                        title={`Copy ${row.startTime} - ${row.endTime} to all days`}
                        onClick={() => handleCopyToAllDays(row.dayIndex)}
                      >
                        <Copy size={13} /> Copy to all
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="day-off-notice">
                    <Info size={15} />
                    <span>No bookings accepted on this day.</span>
                  </div>
                )}
              </div>
            );
          })}

          <div className="bottom-save-bar">
            <button
              type="submit"
              className="btn-primary btn-large"
              disabled={saveMutation.isPending || isLoading}
            >
              <Save size={18} />
              {saveMutation.isPending ? "Saving Schedule..." : "Save Operating Schedule"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
