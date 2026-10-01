import {
  X,
  Clock,
  Banknote,
  AlignLeft,
  Smartphone,
  Calendar,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import type { ServiceListingDto } from "../../api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BookingModalProps {
  listing: ServiceListingDto;
  onClose: () => void;
}

export default function BookingModal({ listing, onClose }: BookingModalProps) {
  const durationText = listing.durationHours
    ? `${listing.durationHours} ${listing.durationHours === 1 ? "Hour" : "Hours"} (${listing.durationHours} ${listing.durationHours === 1 ? "1-hour slot" : "consecutive 1-hour slots"})`
    : listing.estimatedDuration || "1 Hour";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-card text-card-foreground border border-border shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="modal-title" className="text-lg font-bold text-foreground tracking-tight">
            Service Details
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Service Highlight */}
          <div className="space-y-2">
            {listing.serviceCategoryName && (
              <Badge variant="secondary" className="text-xs font-medium">
                {listing.serviceCategoryName}
              </Badge>
            )}
            <h3 className="text-xl font-bold text-foreground tracking-tight">{listing.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-none bg-muted/30 border border-border">
            <div className="sm:col-span-2 space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <AlignLeft className="h-3.5 w-3.5 text-primary" /> Scope of Work
              </span>
              <p className="text-xs font-medium text-foreground">
                {listing.scope || "As generally described."}
              </p>
            </div>
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Banknote className="h-3.5 w-3.5 text-primary" /> Fixed Price
              </span>
              <p className="text-base font-bold text-foreground">
                LKR {listing.fixedPrice.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-primary" /> Time Required
              </span>
              <p className="text-sm font-semibold text-foreground">{durationText}</p>
            </div>
          </div>

          {/* Book on Mobile App Section */}
          <div className="p-5 bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 shrink-0 rounded-none bg-primary/15 text-primary flex items-center justify-center">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-bold text-foreground">Book on Handee Mobile App</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Customer bookings are handled exclusively through our mobile application to
                  provide real-time 1-hour predefined slot selection.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-card p-3 border border-border text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>14-day dynamic date strip</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Predefined 1-hour slot picker</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Guaranteed fixed price</span>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Instant in-app confirmation</span>
              </div>
            </div>

            <a
              href={`handee://listings/${listing.id}`}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2.5 text-sm transition-colors hover:bg-primary/90"
              onClick={() => {
                setTimeout(() => {
                  alert(
                    "Please open or download the Handee Flutter App on your mobile device to book this service listing.",
                  );
                }, 500);
              }}
            >
              <Smartphone className="h-4 w-4" /> Open in Handee App
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-border bg-muted/20">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="min-w-24">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
