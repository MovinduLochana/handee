import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Calendar,
  ShieldCheck,
  CheckCircle,
  User,
  Star,
  Loader2,
} from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceListingsApi } from "../../api/serviceListings";
import type { ProviderProfileCustomerDto, ServiceListingDto } from "../../api/types";
import StarRating from "../../components/provider/StarRating";
import ServiceCategoryTag from "../../components/provider/ServiceCategoryTag";
import ServiceListingCard from "../../components/public/ServiceListingCard";
import BookingModal from "../../components/public/BookingModal";
import EmptyState from "../../components/provider/EmptyState";
import { getFullMediaUrl } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";

export default function PublicProviderProfile() {
  const { providerId } = useParams<{ providerId: string }>();
  const [selectedBookingListing, setSelectedBookingListing] = useState<ServiceListingDto | null>(
    null,
  );

  // Fetch the Customer projection
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["providerProfile", providerId],
    queryFn: () => providerApi.getProfile(providerId!) as Promise<ProviderProfileCustomerDto>,
    enabled: !!providerId,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["providerReviews", providerId],
    queryFn: () => providerApi.getReviews(providerId!, 1, 5),
    enabled: !!providerId,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["providerListings", providerId],
    queryFn: () => serviceListingsApi.getByProviderId(providerId!),
    enabled: !!providerId,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground">Loading provider...</div>;
  }

  if (isError || !profile) {
    return (
      <div className="p-12 text-center">
        <EmptyState
          icon={<ShieldCheck className="w-8 h-8" />}
          title="Provider Not Found"
          description="This provider profile doesn't exist or is currently unavailable."
          action={
            <Link to="/providers" className={buttonVariants()}>
              Back to Providers
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Nav */}
        <nav>
          <Link
            to="/providers"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Providers
          </Link>
        </nav>

        {/* Hero */}
        <Card className="rounded-none border-border">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0">
              {profile.profilePictureUrl ? (
                <img
                  src={getFullMediaUrl(profile.profilePictureUrl)}
                  alt={profile.fullName}
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover border border-border"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground border border-border">
                  {profile.fullName.charAt(0).toUpperCase()}
                </div>
              )}

              {profile.verificationStatus === "Verified" && (
                <div
                  className="absolute -bottom-1 -right-1 bg-background p-1 shadow-xs"
                  title="Verified Provider"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {profile.fullName}
              </h1>
              <p className="text-base text-muted-foreground">{profile.headline}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2">
                <StarRating
                  rating={profile.ratingAggregate}
                  count={profile.totalReviewCount}
                  showValue={true}
                />

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{profile.serviceAreaDisplayName || "Flexible Area"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <Card className="rounded-none border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/40 border border-border">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Experience
                    </h4>
                    <p className="text-base font-semibold text-foreground mt-0.5">
                      {profile.yearsOfExperience} Years
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Languages
                    </h4>
                    <p className="text-base font-semibold text-foreground mt-0.5">
                      {profile.languages.length > 0 ? profile.languages.join(", ") : "English"}
                    </p>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </p>
                )}
                {profile.description && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {profile.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills & Services Section */}
            <Card className="rounded-none border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" /> Skills & Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile.serviceCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.serviceCategories.map((cat) => (
                      <ServiceCategoryTag key={cat.id} category={cat} />
                    ))}
                  </div>
                )}

                {profile.servicesOffered.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Specific Services Offered
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground list-disc list-inside">
                      {profile.servicesOffered.map((srv, i) => (
                        <li key={i}>{srv}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t border-border space-y-4">
                  <h4 className="text-base font-semibold text-foreground">Fixed-Price Services</h4>
                  {listingsLoading ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <p className="text-sm">Loading service catalogue...</p>
                    </div>
                  ) : listingsData && listingsData.filter((l) => l.isActive).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {listingsData
                        .filter((l) => l.isActive)
                        .map((listing) => (
                          <div key={listing.id}>
                            <ServiceListingCard
                              listing={listing}
                              onBookClick={(lst) => setSelectedBookingListing(lst)}
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-border text-center text-sm text-muted-foreground">
                      This provider hasn't listed any fixed-price services yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card className="rounded-none border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" /> Customer Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <p className="text-sm">Loading reviews...</p>
                  </div>
                ) : !reviewsData || reviewsData.items.length === 0 ? (
                  <EmptyState
                    icon={<Star className="w-6 h-6" />}
                    title="No Reviews Yet"
                    description={`${profile.fullName} is new or hasn't received any reviews yet.`}
                  />
                ) : (
                  <div className="space-y-4 divide-y divide-border">
                    {reviewsData.items.map((review) => (
                      <div key={review.id} className="pt-4 first:pt-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-muted flex items-center justify-center font-semibold text-xs border border-border">
                              {review.customerProfilePictureUrl ? (
                                <img
                                  src={getFullMediaUrl(review.customerProfilePictureUrl)}
                                  alt={review.customerName}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                review.customerName.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {review.customerName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <StarRating rating={review.rating} size={14} />
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="rounded-none border-border sticky top-6">
              <CardContent className="p-6 space-y-4">
                <Button
                  className="w-full gap-2 justify-center py-6 text-base"
                  disabled={!profile.isAvailableForWork}
                  onClick={() => alert("Booking flow not implemented.")}
                >
                  <Calendar className="w-5 h-5" />
                  {profile.isAvailableForWork ? "Request Service" : "Currently Unavailable"}
                </Button>

                {!profile.isAvailableForWork && profile.availabilityNote && (
                  <p className="text-xs text-destructive text-center">{profile.availabilityNote}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {selectedBookingListing && (
        <BookingModal
          listing={selectedBookingListing}
          onClose={() => setSelectedBookingListing(null)}
        />
      )}
    </>
  );
}
