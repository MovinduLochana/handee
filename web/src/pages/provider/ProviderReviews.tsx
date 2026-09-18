import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { providerApi } from "../../api/providers";
import StarRating from "../../components/provider/StarRating";
import EmptyState from "../../components/provider/EmptyState";
import "./ProviderReviews.css";

export default function ProviderReviews() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: providerApi.getMyProfile,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["myReviews", profile?.id, page],
    queryFn: () => providerApi.getReviews(profile!.id!, page, pageSize),
    enabled: !!profile?.id,
  });

  if (profileLoading || reviewsLoading) {
    return <div style={{ padding: "4rem", textAlign: "center" }}>Loading reviews...</div>;
  }

  if (!profile) return null;

  const { ratingAggregate, totalReviewCount } = profile;
  const items = reviewsData?.items || [];
  const totalCount = reviewsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Placeholder distribution logic (in a real app, backend provides this grouping)
  const distribution = [
    { stars: 5, pct: 75, count: Math.round(totalReviewCount * 0.75) },
    { stars: 4, pct: 15, count: Math.round(totalReviewCount * 0.15) },
    { stars: 3, pct: 5, count: Math.round(totalReviewCount * 0.05) },
    { stars: 2, pct: 3, count: Math.round(totalReviewCount * 0.03) },
    { stars: 1, pct: 2, count: Math.round(totalReviewCount * 0.02) },
  ];

  return (
    <div className="reviews-container animate-fade-up">
      <h1 className="admin-title" style={{ marginBottom: "1.5rem" }}>
        Customer Reviews
      </h1>

      {totalReviewCount === 0 ? (
        <EmptyState
          icon={<Star size={32} />}
          title="No Reviews Yet"
          description="You haven't received any customer reviews. Complete jobs to start building your reputation!"
        />
      ) : (
        <>
          <div className="reviews-summary-card">
            <div className="reviews-aggregate">
              <div className="aggregate-score">{ratingAggregate.toFixed(1)}</div>
              <div className="aggregate-stars">
                <StarRating rating={ratingAggregate} size={24} />
              </div>
              <div className="aggregate-count">
                {totalReviewCount} {totalReviewCount === 1 ? "Review" : "Reviews"}
              </div>
            </div>

            <div className="reviews-distribution">
              {distribution.map((d) => (
                <div key={d.stars} className="dist-row">
                  <div className="dist-label">{d.stars}★</div>
                  <div className="dist-bar-container">
                    <div className="dist-bar-fill" style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="reviews-list">
            {items.map((review) => (
              <div key={review.id} className="provider-review-card">
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
                  <StarRating rating={review.rating} size={16} />
                </div>
                {review.comment && <p className="review-body">{review.comment}</p>}

                <div className="provider-review-reply">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                    }}
                  >
                    <MessageSquare size={14} /> Reply to Customer
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)" }}>
                    <em>Replying functionality is not yet supported in this version.</em>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
                marginTop: "2.5rem",
              }}
            >
              <button
                className="wizard-btn wizard-btn-secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {page} of {totalPages}
              </div>
              <button
                className="wizard-btn wizard-btn-secondary"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
