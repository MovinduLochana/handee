import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Calendar,
  ShieldCheck,
  CheckCircle,
  User,
  Star,
} from "lucide-react";
import { providerApi } from "../../api/providers";
import type { ProviderProfileCustomerDto } from "../../api/types";
import StarRating from "../../components/provider/StarRating";
import SkillCategoryTag from "../../components/provider/SkillCategoryTag";
import EmptyState from "../../components/provider/EmptyState";
import "./PublicProviderProfile.css";

export default function PublicProviderProfile() {
  const { providerId } = useParams<{ providerId: string }>();

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
            <div className="public-avatar-fallback">{profile.fullName.charAt(0).toUpperCase()}</div>
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

            {profile.skillCategories.length > 0 && (
              <div className="mb-6">
                <div className="skill-tags">
                  {profile.skillCategories.map((cat) => (
                    <SkillCategoryTag key={cat.id} category={cat} />
                  ))}
                </div>
              </div>
            )}

            {profile.servicesOffered.length > 0 && (
              <div>
                <h4 className="services-heading">Services</h4>
                <ul className="services-list">
                  {profile.servicesOffered.map((srv, i) => (
                    <li key={i}>{srv}</li>
                  ))}
                </ul>
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
            <button
              className="public-book-btn"
              disabled={!profile.isAvailableForWork}
              onClick={() => alert("Booking flow not implemented.")}
            >
              <Calendar size={18} />
              {profile.isAvailableForWork ? "Request Service" : "Currently Unavailable"}
            </button>

            {!profile.isAvailableForWork && profile.availabilityNote && (
              <p className="availability-note">{profile.availabilityNote}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
