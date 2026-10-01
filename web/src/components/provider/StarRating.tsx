import { Star } from "lucide-react";

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
    <div className="star-rating inline-flex items-center gap-1.5 text-xs text-foreground">
      <div className="star-rating-stars inline-flex items-center gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => {
          const filled = rating >= i + 1;
          const half = !filled && rating > i && rating < i + 1;

          return (
            <span
              key={i}
              className="star-wrapper relative inline-flex items-center justify-center text-muted-foreground/30"
              style={{ width: size, height: size }}
            >
              {/* Background (empty) star */}
              <Star size={size} className="star-empty text-muted-foreground/30" strokeWidth={1.5} />
              {/* Filled overlay */}
              {(filled || half) && (
                <span
                  className={`star-fill-clip absolute inset-0 overflow-hidden text-amber-500 ${
                    filled ? "w-full" : "w-1/2"
                  }`}
                >
                  <Star
                    size={size}
                    className="star-filled text-amber-500 fill-amber-500"
                    strokeWidth={1.5}
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="star-rating-value font-semibold text-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="star-rating-count text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
