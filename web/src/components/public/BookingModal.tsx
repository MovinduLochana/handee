import { useState, useId } from "react";
import { X, Clock, Banknote, CalendarCheck, AlignLeft, Calendar, AlertCircle } from "lucide-react";
import { bookingApi } from "../../api/bookings";
import type { BookingResponseDto, ServiceListingDto } from "../../api/types";
import "./BookingModal.css";

interface BookingModalProps {
  listing: ServiceListingDto;
  onClose: () => void;
  onSuccess?: (booking: BookingResponseDto) => void;
}

export default function BookingModal({ listing, onClose, onSuccess }: BookingModalProps) {
  const scheduleId = useId();
  const notesId = useId();

  // Default to tomorrow 10:00 AM in local ISO-slice (YYYY-MM-DDTHH:mm)
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduledAt) {
      setErrorMessage("Please select a date and time.");
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      setErrorMessage("Booking scheduled time must be in the future.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await bookingApi.createFromListing({
        serviceListingId: listing.id,
        scheduledAt: scheduledDate.toISOString(),
        notes: notes.trim() || undefined,
      });

      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        (typeof data === "string" && data.trim()) ||
        data?.error ||
        data?.message ||
        err?.message ||
        "Failed to schedule booking. Please try another time slot.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="booking-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="booking-modal-content">
        <div className="booking-modal-header">
          <h2 id="modal-title">Book Service</h2>
          <button onClick={onClose} className="btn-close" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleBookSubmit}>
          <div className="booking-modal-body">
            <div className="service-highlight">
              {listing.serviceCategoryName && (
                <span className="service-badge">{listing.serviceCategoryName}</span>
              )}
              <h3 className="service-title">{listing.title}</h3>
              <p className="service-description">{listing.description}</p>
            </div>

            <div className="service-details-grid">
              <div className="detail-item full-width">
                <span className="detail-label">
                  <AlignLeft size={16} /> Scope of Work
                </span>
                <p className="detail-value">{listing.scope || "As generally described."}</p>
              </div>
              <div className="detail-item full-width">
                <span className="detail-label">
                  <Clock size={16} /> Availability
                </span>
                <p className="detail-value">{listing.availability || "Check with provider."}</p>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  <Banknote size={16} /> Fixed Price
                </span>
                <p className="detail-value price-text">LKR {listing.fixedPrice.toFixed(2)}</p>
              </div>
              <div className="detail-item">
                <span className="detail-label">
                  <Clock size={16} /> Estimated Duration
                </span>
                <p className="detail-value">{listing.estimatedDuration}</p>
              </div>
            </div>

            {errorMessage && (
              <div className="booking-modal-error" role="alert">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="booking-form-fields">
              <div className="form-group">
                <label htmlFor={scheduleId} className="form-label">
                  <Calendar size={16} /> Schedule Date & Time
                </label>
                <input
                  id={scheduleId}
                  type="datetime-local"
                  className="form-input"
                  value={scheduledAt}
                  onChange={(e) => {
                    setScheduledAt(e.target.value);
                    setErrorMessage(null);
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor={notesId} className="form-label">
                  Special Notes / Instructions
                </label>
                <textarea
                  id={notesId}
                  className="form-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Landmark, access instructions, or special requests"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="booking-modal-footer">
            <button type="button" onClick={onClose} className="btn-cancel" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-confirm-book" disabled={isSubmitting}>
              <CalendarCheck size={18} /> {isSubmitting ? "Booking..." : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
