import type { ServiceCategoryDto } from "../../api/types";
import "./ServiceCategoryTag.css";

interface ServiceCategoryTagProps {
  category: ServiceCategoryDto;
  selected?: boolean;
  onClick?: () => void;
}

export default function ServiceCategoryTag({
  category,
  selected = false,
  onClick,
}: ServiceCategoryTagProps) {
  const isClickable = !!onClick;

  return (
    <span
      className={`skill-tag ${selected ? "skill-tag-selected" : ""} ${isClickable ? "skill-tag-clickable" : ""}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {category.iconUrl && (
        <img
          src={category.iconUrl}
          alt=""
          loading="lazy"
          className="skill-tag-icon"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {category.name}
    </span>
  );
}
