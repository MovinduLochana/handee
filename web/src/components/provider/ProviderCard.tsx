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
      <div className="provider-card-header">
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

        <div className="provider-card-info">
          <h3 className="provider-card-name">
            {provider.fullName}
            {provider.verificationStatus === "Verified" && (
              <span title="Verified Provider" style={{ display: "flex" }}>
                <CheckCircle size={16} strokeWidth={2.5} color="var(--accent)" />
              </span>
            )}
          </h3>
          <p className="provider-card-headline">{provider.headline || "Professional Provider"}</p>
          <div className="provider-card-stats">
            <StarRating
              rating={provider.ratingAggregate}
              count={provider.totalReviewCount}
              size={14}
              showValue
            />

            <div className="provider-card-stat-item" title="Service Area">
              <MapPin size={14} />
              <span>{provider.serviceAreaDisplayName || "Flexible Area"}</span>
            </div>
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
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              +{provider.skillCategories.length - 3} more
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
