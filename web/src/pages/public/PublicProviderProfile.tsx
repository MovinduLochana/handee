import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  ShieldCheck,
  CheckCircle,
  User,
  Star,
  Smartphone,
} from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceListingsApi } from "../../api/serviceListings";
import type { ProviderProfileCustomerDto, ServiceListingDto } from "../../api/types";
import StarRating from "../../components/provider/StarRating";
import ServiceCategoryTag from "../../components/provider/ServiceCategoryTag";
import ServiceListingCard from "../../components/public/ServiceListingCard";
import BookingModal from "../../components/public/BookingModal";
import EmptyState from "../../components/provider/EmptyState";
import "./PublicProviderProfile.css";

export default function PublicProviderProfile() {
  const { providerId } = useParams<{ providerId: string }>();
  const [selectedBookingListing, setSelectedBookingListing] = useState<ServiceListingDto | null>(
    null,
  );

  // Fetch the Customer projection
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["providerProfile", providerId],
    queryFn: () => providerApi.getProfile(providerId!) as Promise<ProviderProfileCustomerDto>,
    enabled: !!providerId,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["providerReviews", providerId],
    queryFn: () => providerApi.getReviews(providerId!, 1, 5),
    enabled: !!providerId,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["providerListings", providerId],
    queryFn: () => serviceListingsApi.getByProviderId(providerId!),
    enabled: !!providerId,
  });

  if (isLoading) {
    return <div className="state-container">Loading provider...</div>;
  }

  if (isError || !profile) {
    return (
      <div className="state-container">
        <EmptyState
          icon={<ShieldCheck size={32} />}
          title="Provider Not Found"
          description="This provider profile doesn't exist or is currently unavailable."
          action={
            <Link to="/" className="wizard-btn wizard-btn-primary">
              Return Home
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="public-profile-layout animate-fade-up">
        {/* Nav */}
        <nav className="public-nav">
          <Link to="/" className="public-back-btn">
            <ArrowLeft size={16} /> Back to Search
          </Link>
        </nav>

        {/* Hero */}
        <header className="public-hero">
          <div className="public-avatar-wrapper animate-fade-up">
            {profile.profilePictureUrl ? (
              <img
                src={
                  profile.profilePictureUrl.startsWith("http")
                    ? profile.profilePictureUrl
                    : `http://localhost:5057${profile.profilePictureUrl}`
                }
                alt={profile.fullName}
                className="public-avatar"
              />
            ) : (
              <div className="public-avatar-fallback">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
            )}

            {profile.verificationStatus === "Verified" && (
              <div className="public-verified-badge" title="Verified Provider">
                <CheckCircle size={18} strokeWidth={3} />
              </div>
            )}
          </div>

          <div className="animate-fade-up animate-delay-100">
            <h1 className="public-hero-title">{profile.fullName}</h1>
            <p className="public-hero-headline">{profile.headline}</p>

            <div className="public-hero-stats">
              <StarRating
                rating={profile.ratingAggregate}
                count={profile.totalReviewCount}
                showValue={true}
              />

              <div className="public-stat">
                <MapPin size={16} color="var(--accent)" />
                {profile.serviceAreaDisplayName || "Flexible Area"}
              </div>
            </div>
          </div>
        </header>

        {/* Grid */}
        <main className="public-main">
          <div className="public-main-content">
            <section className="public-section animate-fade-up animate-delay-200">
              <h2>
                <User size={20} color="var(--accent)" /> About
              </h2>

              <div className="public-info-grid">
                <div className="public-info-item">
                  <h4>Experience</h4>
                  <p>{profile.yearsOfExperience} Years</p>
                </div>
                <div className="public-info-item">
                  <h4>Languages</h4>
                  <p>{profile.languages.length > 0 ? profile.languages.join(", ") : "English"}</p>
                </div>
              </div>

              {profile.bio && <p className="public-bio">{profile.bio}</p>}
              {profile.description && (
                <div className="public-bio-divider">
                  <p className="public-bio">{profile.description}</p>
                </div>
              )}
            </section>

            <section className="public-section animate-fade-up animate-delay-300">
              <h2>
                <Briefcase size={20} color="var(--accent-warm)" /> Skills & Services
              </h2>

              {profile.serviceCategories.length > 0 && (
                <div className="mb-6">
                  <div className="skill-tags">
                    {profile.serviceCategories.map((cat) => (
                      <ServiceCategoryTag key={cat.id} category={cat} />
                    ))}
                  </div>
                </div>
              )}

              {profile.servicesOffered.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <h4
                    className="services-heading"
                    style={{ fontSize: "1rem", marginBottom: "0.5rem" }}
                  >
                    Specific Services Offered
                  </h4>
                  <ul className="services-list">
                    {profile.servicesOffered.map((srv, i) => (
                      <li key={i}>{srv}</li>
                    ))}
                  </ul>
                </div>
              )}

              {listingsLoading ? (
                <div
                  style={{
                    marginTop: "var(--space-10)",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    className="flex-center"
                    style={{ padding: "var(--space-8)", gap: "var(--space-3)" }}
                  >
                    <p style={{ color: "var(--text-muted)", margin: 0 }}>
                      Loading service catalogue...
                    </p>
                  </div>
                </div>
              ) : (
                <div id="fixed-price-services" style={{ marginTop: "var(--space-10)" }}>
                  <h4
                    className="services-heading"
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      marginBottom: "var(--space-4)",
                      color: "var(--text-h)",
                    }}
                  >
                    Fixed-Price Services
                  </h4>
                  {listingsData && listingsData.filter((l) => l.isActive).length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "var(--space-6)",
                      }}
                    >
                      {listingsData
                        .filter((l) => l.isActive)
                        .map((listing, idx) => (
                          <div
                            key={listing.id}
                            className="animate-fade-up"
                            style={{ animationDelay: `${(idx % 10) * 50}ms` }}
                          >
                            <ServiceListingCard
                              listing={listing}
                              onBookClick={(lst) => setSelectedBookingListing(lst)}
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div
                      className="empty-state"
                      style={{
                        padding: "var(--space-8)",
                        background: "var(--bg-surface)",
                        border: "1px dashed var(--border-strong)",
                        borderRadius: "12px",
                      }}
                    >
                      <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: 0 }}>
                        This provider hasn't listed any fixed-price services yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="public-section animate-fade-up animate-delay-400">
              <h2>Customer Reviews</h2>

              {reviewsLoading ? (
                <div>Loading reviews...</div>
              ) : !reviewsData || reviewsData.items.length === 0 ? (
                <EmptyState
                  icon={<Star size={24} />}
                  title="No Reviews Yet"
                  description={`${profile.fullName} is new or hasn't received any reviews yet.`}
                />
              ) : (
                <div>
                  {reviewsData.items.map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-header">
                        <div className="review-author">
                          <div className="review-avatar">
                            {review.customerProfilePictureUrl ? (
                              <img
                                src={`http://localhost:5057${review.customerProfilePictureUrl}`}
                                alt={review.customerName}
                                loading="lazy"
                              />
                            ) : (
                              review.customerName.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="review-name">{review.customerName}</p>
                            <p className="review-date">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <StarRating rating={review.rating} size={14} />
                      </div>
                      {review.comment && <p className="review-body">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="public-sidebar animate-fade-up animate-delay-300">
            <div className="public-sidebar-card">
              <div
                className="public-mobile-cta"
                style={{
                  padding: "var(--space-6)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  textAlign: "center",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--primary-ultra-light, #e0f2fe)",
                    color: "var(--accent, #0284c7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto var(--space-3)",
                  }}
                >
                  <Smartphone size={24} />
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 var(--space-2)" }}>
                  Book on Mobile App
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                    margin: "0 0 var(--space-4)",
                  }}
                >
                  Customer bookings and predefined 1-hour time slots are scheduled exclusively on
                  the Handee Mobile App.
                </p>
                <a
                  href="#fixed-price-services"
                  className="wizard-btn wizard-btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    textDecoration: "none",
                    boxSizing: "border-box",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("fixed-price-services")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Browse Fixed Services
                </a>
              </div>

              {!profile.isAvailableForWork && profile.availabilityNote && (
                <p className="availability-note" style={{ marginTop: "var(--space-3)" }}>
                  {profile.availabilityNote}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>

      {selectedBookingListing && (
        <BookingModal
          listing={selectedBookingListing}
          onClose={() => setSelectedBookingListing(null)}
        />
      )}
    </>
  );
}
