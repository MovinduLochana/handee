import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { providerApi } from "../../api/providers";
import StarRating from "../../components/provider/StarRating";
import EmptyState from "../../components/provider/EmptyState";
import { getFullMediaUrl } from "../../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProviderReviews() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: providerApi.getMyProfile,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["myReviews", profile?.id, page],
    queryFn: () => providerApi.getReviews(profile!.id!, page, pageSize),
    enabled: !!profile?.id,
  });

  if (profileLoading || reviewsLoading) {
    return <div className="p-16 text-center text-muted-foreground text-sm">Loading reviews...</div>;
  }

  if (!profile) return null;

  const { ratingAggregate, totalReviewCount } = profile;
  const items = reviewsData?.items || [];
  const totalCount = reviewsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const distribution = [
    { stars: 5, pct: 75 },
    { stars: 4, pct: 15 },
    { stars: 3, pct: 5 },
    { stars: 2, pct: 3 },
    { stars: 1, pct: 2 },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Reviews</h1>
        <p className="text-muted-foreground text-sm">
          Feedback and ratings from your completed service jobs.
        </p>
      </header>

      {totalReviewCount === 0 ? (
        <EmptyState
          icon={<Star size={32} />}
          title="No Reviews Yet"
          description="You haven't received any customer reviews. Complete jobs to start building your reputation!"
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              <div className="text-center sm:border-r border-border sm:pr-6 space-y-2">
                <div className="text-5xl font-extrabold text-foreground">
                  {ratingAggregate.toFixed(1)}
                </div>
                <div className="flex justify-center">
                  <StarRating rating={ratingAggregate} size={20} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalReviewCount} {totalReviewCount === 1 ? "Review" : "Reviews"}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-2">
                {distribution.map((d) => (
                  <div key={d.stars} className="flex items-center gap-3 text-xs">
                    <span className="w-6 font-medium text-foreground">{d.stars}★</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {items.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {review.customerProfilePictureUrl && (
                          <AvatarImage
                            src={getFullMediaUrl(review.customerProfilePictureUrl)}
                            alt={review.customerName}
                          />
                        )}
                        <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                          {review.customerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {review.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} size={15} />
                  </div>

                  {review.comment && (
                    <p className="text-xs text-foreground/90 leading-relaxed">{review.comment}</p>
                  )}

                  <div className="p-3 bg-muted/50 rounded border border-border space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <MessageSquare className="h-3.5 w-3.5" /> Reply to Customer
                    </div>
                    <p className="italic">
                      Replying functionality is not yet supported in this version.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-xs font-medium text-muted-foreground">
                {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="gap-1 text-xs"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
