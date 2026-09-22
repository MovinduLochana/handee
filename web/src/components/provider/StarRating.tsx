import { Star } from "lucide-react";
import "./StarRating.css";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  showValue?: boolean;
  count?: number;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  showValue = false,
  count,
}: StarRatingProps) {
  return (
    <div className="star-rating">
      <div className="star-rating-stars">
        {Array.from({ length: maxStars }, (_, i) => {
          const filled = rating >= i + 1;
          const half = !filled && rating > i && rating < i + 1;

          return (
            <span key={i} className="star-wrapper" style={{ width: size, height: size }}>
              {/* Background (empty) star */}
              <Star size={size} className="star-empty" strokeWidth={1.5} />
              {/* Filled overlay */}
              {(filled || half) && (
                <span className="star-fill-clip" style={{ width: filled ? "100%" : "50%" }}>
                  <Star size={size} className="star-filled" strokeWidth={1.5} fill="currentColor" />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showValue && <span className="star-rating-value">{rating.toFixed(1)}</span>}
      {count !== undefined && <span className="star-rating-count">({count})</span>}
    </div>
  );
}
