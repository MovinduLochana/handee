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
  return (
    <Card
      className={`service-listing-card flex flex-col justify-between transition-shadow hover:shadow-md bg-card text-card-foreground border-border ${
        !listing.isActive && mode === "provider" ? "opacity-60" : ""
      }`}
    >
      <CardContent className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              {listing.serviceCategoryName && (
                <Badge variant="secondary" className="mb-1 text-xs">
                  {listing.serviceCategoryName}
                </Badge>
              )}
              <h3 className="font-bold text-base text-foreground line-clamp-2">{listing.title}</h3>
            </div>
            {mode === "provider" && onEditClick && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEditClick(listing)}
                className="h-8 w-8 shrink-0"
                aria-label="Edit Listing"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
            {listing.description}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
            <div className="font-bold text-base text-foreground">
              LKR {listing.fixedPrice.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground font-medium">
              <Clock className="h-3.5 w-3.5" /> {listing.estimatedDuration}
            </div>
          </div>

          {!listing.isActive && mode === "provider" && (
            <div className="mt-3 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 border border-amber-500/20 text-center">
              Paused • Hidden from profile
            </div>
          )}
        </div>
      </CardContent>
      {mode === "public" && (
        <div className="p-5 pt-0">
          <Button className="w-full" onClick={() => onBookClick && onBookClick(listing)}>
            Book Now
          </Button>
        </div>
      )}
    </Card>
  );
}
