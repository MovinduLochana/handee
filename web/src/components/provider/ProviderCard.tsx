import { Link } from "react-router-dom";
import { CheckCircle, MapPin } from "lucide-react";
import type { ProviderProfileCustomerDto } from "../../api/types";
import { getFullMediaUrl } from "../../lib/api";
import StarRating from "./StarRating";
import ServiceCategoryTag from "./ServiceCategoryTag";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProviderCardProps {
  provider: ProviderProfileCustomerDto;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  const avatarUrl = provider.profilePictureUrl ? getFullMediaUrl(provider.profilePictureUrl) : null;

  return (
    <Card className="provider-card overflow-hidden hover:shadow-md transition-all border-border bg-card text-card-foreground group">
      <Link to={`/providers/${provider.id}`} className="block">
        <div className="h-20 bg-muted/60 border-b border-border/50 relative"></div>

        <CardContent className="pt-0 px-5 pb-5 relative">
          <div className="-mt-10 mb-3 flex items-end justify-between">
            <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={provider.fullName} />}
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                {provider.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {provider.verificationStatus === "Verified" && (
              <span
                title="Verified Provider"
                className="provider-verified-badge inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20"
              >
                <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> Verified
              </span>
            )}
          </div>

          <h3 className="provider-card-name font-bold text-base text-foreground group-hover:text-primary transition-colors">
            {provider.fullName}
          </h3>

          <p className="provider-card-headline text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {provider.headline || "Professional Provider"}
          </p>

          <div className="provider-card-metrics flex items-center gap-3 mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground flex-wrap">
            <div className="provider-metric-pill inline-flex items-center" title="Rating">
              <StarRating
                rating={provider.ratingAggregate}
                count={provider.totalReviewCount}
                size={12}
                showValue
              />
            </div>

            <div
              className="provider-metric-pill inline-flex items-center gap-1"
              title="Service Area"
            >
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[120px]">
                {provider.serviceAreaDisplayName || "Flexible"}
              </span>
            </div>
          </div>

          <div className="provider-card-bottom mt-3 pt-2">
            <div className="provider-card-tags flex items-center gap-1.5 flex-wrap">
              {provider.serviceCategories.length > 0 ? (
                provider.serviceCategories
                  .slice(0, 3)
                  .map((cat) => <ServiceCategoryTag key={cat.id} category={cat} />)
              ) : (
                <span className="text-xs text-muted-foreground">No categories listed</span>
              )}
              {provider.serviceCategories.length > 3 && (
                <span className="text-[11px] text-muted-foreground font-medium">
                  +{provider.serviceCategories.length - 3} more
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
