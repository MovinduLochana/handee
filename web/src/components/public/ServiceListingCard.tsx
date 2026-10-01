import { Clock, Edit2 } from "lucide-react";
import type { ServiceListingDto } from "../../api/types";

interface ServiceListingCardProps {
  listing: ServiceListingDto;
  onBookClick?: (listing: ServiceListingDto) => void;
  onEditClick?: (listing: ServiceListingDto) => void;
  mode?: "public" | "provider";
}

export default function ServiceListingCard({
  listing,
  onBookClick,
  onEditClick,
  mode = "public",
}: ServiceListingCardProps) {
  return (
    <div
      className={`service-listing-card ${!listing.isActive && mode === "provider" ? "inactive" : ""}`}
    >
      <div className="service-listing-content">
        <div className="service-listing-header">
          <div className="service-title-container">
            {listing.serviceCategoryName && (
              <span className="service-badge">{listing.serviceCategoryName}</span>
            )}
            <h3 className="service-title line-clamp-2">{listing.title}</h3>
          </div>
          {mode === "provider" && onEditClick && (
            <button
              onClick={() => onEditClick(listing)}
              className="btn-icon circle-edit-btn"
              aria-label="Edit Listing"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
        <p className="service-description line-clamp-3">{listing.description}</p>
        <div className="service-meta">
          <div className="service-price">LKR {listing.fixedPrice.toFixed(2)}</div>
          <div className="service-duration">
            <Clock size={14} />{" "}
            {listing.durationHours
              ? `${listing.durationHours} ${listing.durationHours === 1 ? "Hour" : "Hours"}`
              : listing.estimatedDuration}
          </div>
        </div>

        {!listing.isActive && mode === "provider" && (
          <div className="status-banner">Paused • Hidden from profile</div>
        )}
      </div>
      {mode === "public" && (
        <div className="service-listing-actions">
          <button className="btn-book-service" onClick={() => onBookClick && onBookClick(listing)}>
            Book Now
          </button>
        </div>
      )}
    </div>
  );
}
