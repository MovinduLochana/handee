import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { serviceListingsApi } from "../../api/serviceListings";
import ServiceListingForm from "../../components/provider/ServiceListingForm";
import { Plus, Loader2, CheckCircle, Package, Sparkles } from "lucide-react";
import ServiceListingCard from "../../components/public/ServiceListingCard";
import "./ProviderServiceListings.css";

export default function ProviderServiceListings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["myServiceListings"],
    queryFn: serviceListingsApi.getMyServiceListings,
  });

  const activeCount = listings.filter((l) => l.isActive).length;

  return (
    <div className="provider-dashboard-page">
      <div className="dashboard-header animate-fade-up">
        <div>
          <h1 className="hero-title">Service Listings</h1>
          <p className="hero-subtitle">
            Create standardized, fixed-price services for instant customer booking.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingListing(null);
            setIsModalOpen(true);
          }}
          className="btn-primary hover-lift pulse-cta"
        >
          <Plus size={18} strokeWidth={2.5} /> New Listing
        </button>
      </div>

      <div className="dashboard-stats animate-fade-up animate-delay-100">
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper accent-blue-wrapper">
            <Package size={24} />
          </div>
          <div className="stat-info">
            <h3>{listings.length}</h3>
            <p>Total Offerings</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper accent-green-wrapper">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{activeCount}</h3>
            <p>Currently Active</p>
          </div>
        </div>
      </div>

      <div className="listings-grid">
        {isLoading && (
          <div className="loading-state animate-fade-up">
            <Loader2 className="animate-spin text-accent" size={32} />
            <p>Loading your catalogue...</p>
          </div>
        )}

        {!isLoading && listings.length === 0 && (
          <div className="premium-empty-state animate-fade-up animate-delay-200">
            <div className="empty-state-icon-glow">
              <Sparkles size={48} className="text-accent" />
            </div>
            <h3>Create your first fixed-price service</h3>
            <p>
              Fixed-price services let customers book you instantly without asking for a quote. Add
              your first service to get started.
            </p>
            <button
              onClick={() => {
                setEditingListing(null);
                setIsModalOpen(true);
              }}
              className="btn-primary mt-4 hover-lift"
            >
              <Plus size={18} /> Create Listing
            </button>
          </div>
        )}

        {listings.map((listing, idx) => (
          <div
            key={listing.id}
            className="animate-fade-up"
            style={{ animationDelay: `${(idx % 10) * 50 + 200}ms` }}
          >
            <ServiceListingCard
              listing={listing}
              mode="provider"
              onEditClick={(listing) => {
                setEditingListing(listing);
                setIsModalOpen(true);
              }}
            />
          </div>
        ))}
      </div>

      {isModalOpen && (
        <ServiceListingForm initialData={editingListing} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
