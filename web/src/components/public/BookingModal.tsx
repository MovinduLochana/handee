import { Clock, Banknote, CalendarCheck, AlignLeft } from "lucide-react";
import type { ServiceListingDto } from "../../api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BookingModalProps {
  listing: ServiceListingDto;
  onClose: () => void;
}

export default function BookingModal({ listing, onClose }: BookingModalProps) {
  const handleBookSubmit = () => {
    alert("Booking logic not fully implemented yet.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Book Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5 pb-3 border-b border-border">
            {listing.serviceCategoryName && (
              <Badge variant="secondary" className="mb-1 text-xs">
                {listing.serviceCategoryName}
              </Badge>
            )}
            <h3 className="font-bold text-lg text-foreground">{listing.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2 space-y-1 p-2.5 bg-muted/40 border border-border/50">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <AlignLeft className="h-3.5 w-3.5" /> Scope of Work
              </span>
              <p className="text-xs text-foreground">
                {listing.scope || "As generally described."}
              </p>
            </div>
            <div className="col-span-2 space-y-1 p-2.5 bg-muted/40 border border-border/50">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Availability
              </span>
              <p className="text-xs text-foreground">
                {listing.availability || "Check with provider."}
              </p>
            </div>
            <div className="space-y-1 p-2.5 bg-muted/40 border border-border/50">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Banknote className="h-3.5 w-3.5" /> Fixed Price
              </span>
              <p className="font-bold text-sm text-foreground">
                LKR {listing.fixedPrice.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1 p-2.5 bg-muted/40 border border-border/50">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Estimated Duration
              </span>
              <p className="text-xs text-foreground">{listing.estimatedDuration}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleBookSubmit} className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" /> Confirm Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
