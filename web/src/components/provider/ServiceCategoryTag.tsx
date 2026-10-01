import type { ServiceCategoryDto } from "../../api/types";
import { Badge } from "@/components/ui/badge";

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
    <Badge
      variant={selected ? "default" : "outline"}
      className={`skill-tag inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors ${
        isClickable
          ? "cursor-pointer select-none hover:bg-accent hover:text-accent-foreground active:scale-95"
          : ""
      } ${selected ? "shadow-xs" : "bg-card text-card-foreground hover:bg-muted"}`}
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
          className="skill-tag-icon h-3.5 w-3.5 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).classList.add("hidden");
          }}
        />
      )}
      {category.name}
    </Badge>
  );
}
