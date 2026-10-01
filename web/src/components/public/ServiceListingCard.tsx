import { Clock, Edit2 } from "lucide-react";
import type { ServiceListingDto } from "../../api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ServiceListingCardProps {
  listing: ServiceListingDto;
  onBookClick?: (listing: ServiceListingDto) => void;
  onEditClick?: (listing: ServiceListingDto) => void;
  mode?: "public" | "provider";
}

export default function ServiceListingCard({
  listing,
  onBookClick,
  onEditClick,
  mode = "public",
}: ServiceListingCardProps) {
  const isInactive = !listing.isActive && mode === "provider";

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
        isInactive ? "opacity-70 bg-muted/30 border-dashed" : "bg-card"
      }`}
    >
      <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              {listing.serviceCategoryName && (
                <Badge variant="secondary" className="text-[11px] font-medium tracking-wide">
                  {listing.serviceCategoryName}
                </Badge>
              )}
              <h3 className="text-base font-bold text-foreground line-clamp-2 tracking-tight">
                {listing.title}
              </h3>
            </div>
            {mode === "provider" && onEditClick && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEditClick(listing)}
                className="h-8 w-8 shrink-0 rounded-full hover:bg-muted"
                aria-label="Edit Listing"
              >
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>

          <p className="text-xs/relaxed text-muted-foreground line-clamp-3">
            {listing.description}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
            <div className="font-bold text-foreground text-sm">
              LKR {listing.fixedPrice.toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {listing.durationHours
                  ? `${listing.durationHours} ${listing.durationHours === 1 ? "Hour" : "Hours"}`
                  : listing.estimatedDuration}
              </span>
            </div>
          </div>

          {isInactive && (
            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-sm border border-amber-500/20 text-center">
              Paused • Hidden from public profile
            </div>
          )}
        </div>

        {mode === "public" && (
          <div className="pt-2">
            <Button
              className="w-full font-semibold"
              size="sm"
              onClick={() => onBookClick && onBookClick(listing)}
            >
              Book Now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
