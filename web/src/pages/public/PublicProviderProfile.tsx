import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  ShieldCheck,
  CheckCircle,
  User,
  Star,
  Smartphone,
} from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceListingsApi } from "../../api/serviceListings";
import type { ProviderProfileCustomerDto, ServiceListingDto } from "../../api/types";
import StarRating from "../../components/provider/StarRating";
import ServiceCategoryTag from "../../components/provider/ServiceCategoryTag";
import ServiceListingCard from "../../components/public/ServiceListingCard";
import BookingModal from "../../components/public/BookingModal";
import EmptyState from "../../components/provider/EmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading provider...
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="container max-w-lg mx-auto py-16 px-4">
        <EmptyState
          icon={<ShieldCheck className="h-10 w-10 text-muted-foreground" />}
          title="Provider Not Found"
          description="This provider profile doesn't exist or is currently unavailable."
          action={
            <Button asChild className="mt-4">
              <Link to="/">Return Home</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8 animate-fade-up">
        {/* Nav */}
        <nav>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Search
          </Link>
        </nav>

        {/* Hero */}
        <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative shrink-0">
              <Avatar className="h-24 w-24 border-2 border-border shadow-xs">
                {profile.profilePictureUrl ? (
                  <AvatarImage
                    src={
                      profile.profilePictureUrl.startsWith("http")
                        ? profile.profilePictureUrl
                        : `http://localhost:5057${profile.profilePictureUrl}`
                    }
                    alt={profile.fullName}
                  />
                ) : null}
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {profile.fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {profile.verificationStatus === "Verified" && (
                <div
                  className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow-sm ring-2 ring-background"
                  title="Verified Provider"
                >
                  <CheckCircle className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {profile.fullName}
                </h1>
                {profile.verificationStatus === "Verified" && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium"
                  >
                    Verified Pro
                  </Badge>
                )}
              </div>
              {profile.headline && (
                <p className="text-base text-muted-foreground font-medium">{profile.headline}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <StarRating
                  rating={profile.ratingAggregate}
                  count={profile.totalReviewCount}
                  showValue={true}
                />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{profile.serviceAreaDisplayName || "Flexible Area"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* About Section */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/40 p-4 border border-border/50 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Experience
                    </span>
                    <p className="text-lg font-semibold text-foreground">
                      {profile.yearsOfExperience} Years
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-4 border border-border/50 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Languages
                    </span>
                    <p className="text-lg font-semibold text-foreground">
                      {profile.languages.length > 0 ? profile.languages.join(", ") : "English"}
                    </p>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-sm md:text-base text-foreground leading-relaxed">
                    {profile.bio}
                  </p>
                )}
                {profile.description && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {profile.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills & Services Section */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> Skills & Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile.serviceCategories.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                      Categories
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {profile.serviceCategories.map((cat) => (
                        <ServiceCategoryTag key={cat.id} category={cat} />
                      ))}
                    </div>
                  </div>
                )}

                {profile.servicesOffered.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <h4 className="text-sm font-semibold text-foreground">
                      Specific Services Offered
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.servicesOffered.map((srv, i) => (
                        <Badge key={i} variant="secondary" className="px-2.5 py-1 text-xs">
                          {srv}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fixed-Price Services */}
                <div id="fixed-price-services" className="pt-4 border-t border-border space-y-4">
                  <h4 className="text-base font-semibold text-foreground">Fixed-Price Services</h4>
                  {listingsLoading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading service catalogue...
                    </div>
                  ) : listingsData && listingsData.filter((l) => l.isActive).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {listingsData
                        .filter((l) => l.isActive)
                        .map((listing) => (
                          <ServiceListingCard
                            key={listing.id}
                            listing={listing}
                            onBookClick={(lst) => setSelectedBookingListing(lst)}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed rounded-lg text-center bg-muted/20">
                      <p className="text-sm text-muted-foreground">
                        This provider hasn't listed any fixed-price services yet.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Customer Reviews Section */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Customer Reviews
                </CardTitle>
                <CardDescription>Verified feedback from clients on completed jobs.</CardDescription>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Loading reviews...
                  </div>
                ) : !reviewsData || reviewsData.items.length === 0 ? (
                  <EmptyState
                    icon={<Star className="h-8 w-8 text-amber-500" />}
                    title="No Reviews Yet"
                    description={`${profile.fullName} is new or hasn't received any reviews yet.`}
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {reviewsData.items.map((review) => (
                      <div key={review.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              {review.customerProfilePictureUrl ? (
                                <AvatarImage
                                  src={`http://localhost:5057${review.customerProfilePictureUrl}`}
                                  alt={review.customerName}
                                />
                              ) : null}
                              <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                                {review.customerName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
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
                          <p className="text-sm text-muted-foreground leading-relaxed pt-1">
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
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <Card className="shadow-sm border-primary/20 bg-card">
              <CardContent className="p-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Book on Mobile App</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Customer bookings and predefined 1-hour time slots are scheduled exclusively on
                    the Handee Mobile App.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    document
                      .getElementById("fixed-price-services")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Browse Fixed Services
                </Button>

                {!profile.isAvailableForWork && profile.availabilityNote && (
                  <div className="p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs text-left border border-amber-500/20">
                    <strong className="font-semibold block mb-0.5">Availability Note:</strong>
                    {profile.availabilityNote}
                  </div>
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
