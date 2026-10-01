import {
  X,
  Clock,
  Banknote,
  AlignLeft,
  Smartphone,
  Calendar,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import type { ServiceListingDto } from "../../api/types";

interface BookingModalProps {
  listing: ServiceListingDto;
  onClose: () => void;
}

export default function BookingModal({ listing, onClose }: BookingModalProps) {
  const durationText = listing.durationHours
    ? `${listing.durationHours} ${listing.durationHours === 1 ? "Hour" : "Hours"} (${listing.durationHours} ${listing.durationHours === 1 ? "1-hour slot" : "consecutive 1-hour slots"})`
    : listing.estimatedDuration || "1 Hour";

  return (
    <div
      className="booking-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="booking-modal-content">
        <div className="booking-modal-header">
          <h2 id="modal-title">Service Details</h2>
          <button onClick={onClose} className="btn-close" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

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
            <div className="detail-item">
              <span className="detail-label">
                <Banknote size={16} /> Fixed Price
              </span>
              <p className="detail-value price-text">LKR {listing.fixedPrice.toFixed(2)}</p>
            </div>
            <div className="detail-item">
              <span className="detail-label">
                <Clock size={16} /> Time Required
              </span>
              <p className="detail-value">{durationText}</p>
            </div>
          </div>

          {/* ── Book on Mobile App Section ── */}
          <div
            className="book-on-mobile-card"
            style={{
              padding: "var(--space-6)",
              background: "var(--bg, #f8fafc)",
              border: "1px solid var(--border-strong, #cbd5e1)",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "var(--primary-ultra-light, #e0f2fe)",
                  color: "var(--primary, #0284c7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Smartphone size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h4
                  style={{
                    margin: "0 0 4px",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: "var(--text-h)",
                  }}
                >
                  Book on Handee Mobile App
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  Customer bookings are handled exclusively through our mobile application to
                  provide real-time 1-hour predefined slot selection.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                fontSize: "0.825rem",
                color: "var(--text-secondary)",
                padding: "10px 12px",
                background: "var(--bg-surface)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={14} color="var(--primary)" />
                <span>14-day dynamic date strip</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} color="var(--primary)" />
                <span>Predefined 1-hour slot picker</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldCheck size={14} color="var(--primary)" />
                <span>Guaranteed fixed price</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <ExternalLink size={14} color="var(--primary)" />
                <span>Instant in-app confirmation</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <a
                href={`handee://listings/${listing.id}`}
                className="wizard-btn wizard-btn-primary"
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  textDecoration: "none",
                  padding: "0.75rem 1rem",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                }}
                onClick={() => {
                  // Fallback if deep link is not registered on desktop
                  setTimeout(() => {
                    alert(
                      "Please open or download the Handee Flutter App on your mobile device to book this service listing.",
                    );
                  }, 500);
                }}
              >
                <Smartphone size={18} /> Open in Handee App
              </a>
            </div>
          </div>
        </div>

        <div className="booking-modal-footer" style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-cancel"
            style={{ width: "auto", minWidth: "120px" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
