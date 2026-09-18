import { Link } from "react-router-dom";
import { CheckCircle, MapPin } from "lucide-react";
import type { ProviderProfileCustomerDto } from "../../api/types";
import StarRating from "./StarRating";
import SkillCategoryTag from "./SkillCategoryTag";
import "./ProviderCard.css";

interface ProviderCardProps {
  provider: ProviderProfileCustomerDto;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  const avatarUrl = provider.profilePictureUrl
    ? provider.profilePictureUrl.startsWith("http")
      ? provider.profilePictureUrl
      : `http://localhost:5057${provider.profilePictureUrl}`
    : null;

  return (
    <Link to={`/providers/${provider.id}`} className="provider-card">
      <div className="provider-card-hero"></div>

      <div className="provider-card-content">
        <div className="provider-card-avatar-wrapper">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={provider.fullName}
              loading="lazy"
              className="provider-card-avatar"
            />
          ) : (
            <div className="provider-card-fallback-avatar">
              {provider.fullName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h3 className="provider-card-name">
          {provider.fullName}
          {provider.verificationStatus === "Verified" && (
            <span title="Verified Provider" className="provider-verified-badge">
              <CheckCircle size={14} strokeWidth={2.5} color="var(--success)" />
            </span>
          )}
        </h3>

        <p className="provider-card-headline">{provider.headline || "Professional Provider"}</p>

        <div className="provider-card-metrics">
          <div className="provider-metric-pill" title="Rating">
            <StarRating
              rating={provider.ratingAggregate}
              count={provider.totalReviewCount}
              size={12}
              showValue
            />
          </div>

          <div className="provider-metric-pill" title="Service Area">
            <MapPin size={12} />
            <span>{provider.serviceAreaDisplayName || "Flexible"}</span>
          </div>
        </div>
      </div>

      <div className="provider-card-bottom">
        <div className="provider-card-tags">
          {provider.skillCategories.length > 0 ? (
            provider.skillCategories
              .slice(0, 3)
              .map((cat) => <SkillCategoryTag key={cat.id} category={cat} />)
          ) : (
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              No categories listed
            </span>
          )}
          {provider.skillCategories.length > 3 && (
            <span className="provider-card-tag-overflow">
              +{provider.skillCategories.length - 3} more
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
