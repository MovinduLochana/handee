import type { SkillCategoryDto } from "../../api/types";
import "./SkillCategoryTag.css";

interface SkillCategoryTagProps {
  category: SkillCategoryDto;
  selected?: boolean;
  onClick?: () => void;
}

export default function SkillCategoryTag({
  category,
  selected = false,
  onClick,
}: SkillCategoryTagProps) {
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
