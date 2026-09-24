import { X, Clock, Banknote, CalendarCheck, AlignLeft } from "lucide-react";
import type { ServiceListingDto } from "../../api/types";
import "./BookingModal.css";

interface BookingModalProps {
    listing: ServiceListingDto;
    onClose: () => void;
}

export default function BookingModal({ listing, onClose }: BookingModalProps) {
    const handleBookSubmit = () => {
        alert("Booking logic not fully implemented yet.");
        onClose();
    };

    return (
        <div className="booking-modal-overlay">
            <div className="booking-modal-content">
                <div className="booking-modal-header">
                    <h2>Book Service</h2>
                    <button onClick={onClose} className="btn-close"><X size={20} /></button>
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
                            <span className="detail-label"><AlignLeft size={16} /> Scope of Work</span>
                            <p className="detail-value">{listing.scope || "As generally described."}</p>
                        </div>
                        <div className="detail-item full-width">
                            <span className="detail-label"><Clock size={16} /> Availability</span>
                            <p className="detail-value">{listing.availability || "Check with provider."}</p>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label"><Banknote size={16} /> Fixed Price</span>
                            <p className="detail-value price-text">LKR {listing.fixedPrice.toFixed(2)}</p>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label"><Clock size={16} /> Estimated Duration</span>
                            <p className="detail-value">{listing.estimatedDuration}</p>
                        </div>
                    </div>
                </div>

                <div className="booking-modal-footer">
                    <button onClick={onClose} className="btn-cancel">Cancel</button>
                    <button onClick={handleBookSubmit} className="btn-confirm-book">
                        <CalendarCheck size={18} /> Confirm Booking
                    </button>
                </div>
            </div>
        </div>
    );
}
