import { Clock } from "lucide-react";
import type { ServiceListingDto } from "../../api/types";
import "./ServiceListingCard.css";

interface ServiceListingCardProps {
    listing: ServiceListingDto;
    onBookClick?: (listing: ServiceListingDto) => void;
}

export default function ServiceListingCard({ listing, onBookClick }: ServiceListingCardProps) {
    return (
        <div className="service-listing-card">
            <div className="service-listing-content">
                <div className="service-listing-header">
                    {listing.serviceCategoryName && (
                        <span className="service-badge">{listing.serviceCategoryName}</span>
                    )}
                    <h3 className="service-title">{listing.title}</h3>
                </div>
                <p className="service-description">{listing.description}</p>
                <div className="service-meta">
                    <div className="service-price">LKR {listing.fixedPrice.toFixed(2)}</div>
                    <div className="service-duration">
                        <Clock size={14} /> {listing.estimatedDuration}
                    </div>
                </div>
            </div>
            <div className="service-listing-actions">
                <button
                    className="btn-book-service"
                    onClick={() => onBookClick && onBookClick(listing)}
                >
                    Book Now
                </button>
            </div>
        </div>
    );
}
