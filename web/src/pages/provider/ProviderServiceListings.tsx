import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { serviceListingsApi } from "../../api/serviceListings";
import ServiceListingForm from "../../components/provider/ServiceListingForm";
import { Plus, Loader2, CheckCircle, Package, Sparkles } from "lucide-react";
import ServiceListingCard from "../../components/public/ServiceListingCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProviderServiceListings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["myServiceListings"],
    queryFn: serviceListingsApi.getMyServiceListings,
  });

  const activeCount = listings.filter((l) => l.isActive).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Service Listings</h1>
          <p className="text-sm text-muted-foreground">
            Create standardized, fixed-price services for instant customer booking.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingListing(null);
            setIsModalOpen(true);
          }}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> New Listing
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-none border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-none text-primary">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{listings.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Total Offerings
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-none text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Currently Active
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading your catalogue...</p>
          </div>
        )}

        {!isLoading && listings.length === 0 && (
          <Card className="rounded-none border-border border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-center p-12 space-y-4">
              <div className="p-3 bg-muted rounded-full">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Create your first fixed-price service
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Fixed-price services let customers book you instantly without asking for a quote.
                  Add your first service to get started.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingListing(null);
                  setIsModalOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Create Listing
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing.id}>
              <ServiceListingCard
                listing={listing}
                mode="provider"
                onEditClick={(listing) => {
                  setEditingListing(listing);
                  setIsModalOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <ServiceListingForm initialData={editingListing} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
