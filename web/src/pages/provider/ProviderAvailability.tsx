import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Repeat, Trash2, Lock, X } from "lucide-react";
import { providerAvailabilityApi } from "../../api/providerAvailability";
import type { ProviderAvailabilitySlotDto, CreateSlotDto, RecurringScheduleDto } from "../../api/types";
import "./ProviderAvailability.css";

const DAYS_OF_WEEK = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

export default function ProviderAvailability() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<"ALL" | "AVAILABLE" | "BOOKED">("ALL");
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Single Slot Form State
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [slotStartTime, setSlotStartTime] = useState("09:00");
  const [slotEndTime, setSlotEndTime] = useState("10:00");

  // Recurring Schedule Form State
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dailyStart, setDailyStart] = useState("09:00");
  const [dailyEnd, setDailyEnd] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState(60);
  const [recurStartDate, setRecurStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [recurEndDate, setRecurEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSingleModalOpen) {
          setIsSingleModalOpen(false);
          setFormError(null);
        }
        if (isRecurringModalOpen) {
          setIsRecurringModalOpen(false);
          setFormError(null);
        }
      }
    };

    if (isSingleModalOpen || isRecurringModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isSingleModalOpen, isRecurringModalOpen]);

  const { data: slots = [], isLoading, isError, error } = useQuery({
    queryKey: ["providerAvailabilityMine"],
    queryFn: () => providerAvailabilityApi.getMine(),
  });

  const createSingleMutation = useMutation({
    mutationFn: (dto: CreateSlotDto) => providerAvailabilityApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerAvailabilityMine"] });
      setIsSingleModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.response?.data || err.message || "Failed to create slot");
    },
  });

  const createRecurringMutation = useMutation({
    mutationFn: (dto: RecurringScheduleDto) => providerAvailabilityApi.createRecurring(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerAvailabilityMine"] });
      setIsRecurringModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.response?.data || err.message || "Failed to generate recurring schedule");
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: string) => providerAvailabilityApi.delete(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerAvailabilityMine"] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.response?.data || "Failed to delete slot");
    },
  });

  const handleCreateSingle = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const startIso = `${slotDate}T${slotStartTime}:00`;
    const endIso = `${slotDate}T${slotEndTime}:00`;
    const start = new Date(startIso);
    const end = new Date(endIso);

    if (end <= start) {
      setFormError("End time must be after start time.");
      return;
    }

    createSingleMutation.mutate({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
  };

  const handleCreateRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedDays.length === 0) {
      setFormError("Please select at least one day of the week.");
      return;
    }

    const start = new Date(`${recurStartDate}T00:00:00`);
    const end = new Date(`${recurEndDate}T23:59:59`);

    if (end <= start) {
      setFormError("End date must be after start date.");
      return;
    }

    const tzOffsetMinutes = -new Date().getTimezoneOffset();

    createRecurringMutation.mutate({
      daysOfWeek: selectedDays,
      dailyStartTime: `${dailyStart}:00`,
      dailyEndTime: `${dailyEnd}:00`,
      slotDurationMinutes: Number(slotDuration),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      timeZoneOffsetMinutes: tzOffsetMinutes,
    });
  };

  const toggleDay = (dayValue: number) => {
    setSelectedDays(prev =>
      prev.includes(dayValue) ? prev.filter(d => d !== dayValue) : [...prev, dayValue]
    );
  };

  // Group slots by date
  const groupedSlots = useMemo(() => {
    const filtered = slots.filter(s => {
      if (activeFilter === "AVAILABLE") return !s.isBooked;
      if (activeFilter === "BOOKED") return s.isBooked;
      return true;
    });

    const groups: Record<string, ProviderAvailabilitySlotDto[]> = {};
    for (const slot of filtered) {
      const dateKey = new Date(slot.startTime).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(slot);
    }
    return groups;
  }, [slots, activeFilter]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="availability-page animate-fade-up">
      <div className="availability-header">
        <div>
          <h1>Availability & Working Hours</h1>
          <p>Configure when customers can book appointments with you.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => { setIsRecurringModalOpen(true); setFormError(null); }}>
            <Repeat size={16} /> Recurring Schedule
          </button>
          <button className="btn-primary" onClick={() => { setIsSingleModalOpen(true); setFormError(null); }}>
            <Plus size={16} /> Add Slot
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-tab ${activeFilter === "ALL" ? "active" : ""}`}
          onClick={() => setActiveFilter("ALL")}
        >
          All Slots ({slots.length})
        </button>
        <button
          className={`filter-tab ${activeFilter === "AVAILABLE" ? "active" : ""}`}
          onClick={() => setActiveFilter("AVAILABLE")}
        >
          Available ({slots.filter(s => !s.isBooked).length})
        </button>
        <button
          className={`filter-tab ${activeFilter === "BOOKED" ? "active" : ""}`}
          onClick={() => setActiveFilter("BOOKED")}
        >
          Booked ({slots.filter(s => s.isBooked).length})
        </button>
      </div>

      {isLoading ? (
        <div className="state-container">Loading availability schedule...</div>
      ) : isError ? (
        <div className="error-banner">
          Failed to load availability slots:{" "}
          {(error as any)?.response?.data?.message ||
            (typeof (error as any)?.response?.data === "string" ? (error as any)?.response?.data : null) ||
            (error as any)?.message ||
            "Please ensure you are signed in with an active provider account."}
        </div>
      ) : Object.keys(groupedSlots).length === 0 ? (
        <div className="day-card" style={{ textAlign: "center", padding: "3rem" }}>
          <Calendar size={48} className="empty-calendar-icon" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <h3>No Availability Slots Found</h3>
          <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Add single slots or generate a recurring weekly timetable so clients can book appointments.
          </p>
        </div>
      ) : (
        <div className="days-list">
          {Object.entries(groupedSlots).map(([dateLabel, daySlots]) => (
            <div key={dateLabel} className="day-card">
              <h3 className="day-title">
                <Calendar size={18} className="day-title-icon" /> {dateLabel}
              </h3>
              <div className="slots-grid">
                {daySlots.map(slot => (
                  <div
                    key={slot.id}
                    className={`slot-item ${slot.isBooked ? "booked" : "available"}`}
                  >
                    <div>
                      <div className="slot-time">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </div>
                      <span className={`slot-status-badge ${slot.isBooked ? "booked" : "available"}`}>
                        {slot.isBooked ? "Booked" : "Available"}
                      </span>
                    </div>

                    {!slot.isBooked ? (
                      <button
                        className="btn-delete-slot"
                        title="Delete slot"
                        onClick={() => {
                          if (confirm("Delete this availability slot?")) {
                            deleteSlotMutation.mutate(slot.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <Lock size={16} className="slot-locked-icon" title="Reserved for booking" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single Slot Modal */}
      {isSingleModalOpen &&
        createPortal(
          <div
            className="availability-modal-overlay modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="single-slot-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsSingleModalOpen(false);
                setFormError(null);
              }
            }}
          >
            <div className="availability-modal-content modal-content">
              <div className="modal-header">
                <h2 id="single-slot-modal-title">Add Single Time Slot</h2>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close modal"
                  onClick={() => {
                    setIsSingleModalOpen(false);
                    setFormError(null);
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateSingle} className="modal-form">
                <div className="modal-body">
                  {formError && <div className="error-banner">{formError}</div>}
                  <div className="form-group">
                    <label htmlFor="single-slot-date">Date</label>
                    <input
                      id="single-slot-date"
                      type="date"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label htmlFor="single-slot-start">Start Time</label>
                      <input
                        id="single-slot-start"
                        type="time"
                        value={slotStartTime}
                        onChange={(e) => setSlotStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="single-slot-end">End Time</label>
                      <input
                        id="single-slot-end"
                        type="time"
                        value={slotEndTime}
                        onChange={(e) => setSlotEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsSingleModalOpen(false);
                      setFormError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={createSingleMutation.isPending}
                  >
                    {createSingleMutation.isPending ? "Creating..." : "Save Slot"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Recurring Schedule Modal */}
      {isRecurringModalOpen &&
        createPortal(
          <div
            className="availability-modal-overlay modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurring-schedule-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsRecurringModalOpen(false);
                setFormError(null);
              }
            }}
          >
            <div className="availability-modal-content modal-content">
              <div className="modal-header">
                <h2 id="recurring-schedule-modal-title">Generate Recurring Schedule</h2>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close modal"
                  onClick={() => {
                    setIsRecurringModalOpen(false);
                    setFormError(null);
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateRecurring} className="modal-form">
                <div className="modal-body">
                  {formError && <div className="error-banner">{formError}</div>}
                  <div className="form-group">
                    <label>Working Days</label>
                    <div className="days-checkbox-group">
                      {DAYS_OF_WEEK.map((d) => (
                        <label key={d.value} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedDays.includes(d.value)}
                            onChange={() => toggleDay(d.value)}
                          />
                          <span>{d.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label htmlFor="recur-daily-start">Daily Start</label>
                      <input
                        id="recur-daily-start"
                        type="time"
                        value={dailyStart}
                        onChange={(e) => setDailyStart(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="recur-daily-end">Daily End</label>
                      <input
                        id="recur-daily-end"
                        type="time"
                        value={dailyEnd}
                        onChange={(e) => setDailyEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="recur-slot-duration">Slot Duration</label>
                    <select
                      id="recur-slot-duration"
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(Number(e.target.value))}
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={60}>60 Minutes (1 Hour)</option>
                      <option value={90}>90 Minutes</option>
                      <option value={120}>120 Minutes (2 Hours)</option>
                    </select>
                  </div>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label htmlFor="recur-from-date">From Date</label>
                      <input
                        id="recur-from-date"
                        type="date"
                        value={recurStartDate}
                        onChange={(e) => setRecurStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="recur-to-date">To Date</label>
                      <input
                        id="recur-to-date"
                        type="date"
                        value={recurEndDate}
                        onChange={(e) => setRecurEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsRecurringModalOpen(false);
                      setFormError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={createRecurringMutation.isPending}
                  >
                    {createRecurringMutation.isPending ? "Generating..." : "Generate Slots"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
