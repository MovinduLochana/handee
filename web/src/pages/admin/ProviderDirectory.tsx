import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Star, Eye } from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceCategoryApi } from "../../api/serviceCategories";
import StatusBadge from "../../components/provider/StatusBadge";
import { getFullMediaUrl } from "../../lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProviderDirectory() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    skill: "",
  });

  const pageSize = 15;

  const { data: categories = [] } = useQuery({
    queryKey: ["serviceCategories"],
    queryFn: serviceCategoryApi.getServiceCategories,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["providerSearch", page, appliedFilters],
    queryFn: () =>
      providerApi.search({
        page,
        pageSize,
        searchTerm: appliedFilters.searchTerm || undefined,
        serviceCategoryId: appliedFilters.skill || undefined,
      }),
  });

  const handleSearch = () => {
    setPage(1);
    setAppliedFilters({ searchTerm, skill: skillFilter });
  };

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Provider Directory</h1>
        <p className="text-muted-foreground text-sm">
          Search and manage all providers on the Handee platform.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Search Provider</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              className="pl-9 h-9 text-xs"
              placeholder="Name, email, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        <div className="w-full sm:w-56 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Service Category</label>
          <select
            className="w-full h-9 rounded border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleSearch} className="h-9 gap-1.5 text-xs">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Contact / Location</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-12 text-muted-foreground text-sm">
                    Loading directory...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-12 text-muted-foreground text-sm">
                    No providers found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {provider.profilePictureUrl && (
                            <AvatarImage
                              src={getFullMediaUrl(provider.profilePictureUrl)}
                              alt={provider.fullName}
                            />
                          )}
                          <AvatarFallback className="text-xs font-bold">
                            {provider.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground text-sm">
                            {provider.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            ID: {provider.id.split("-")[0]}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{provider.serviceAreaDisplayName || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground max-w-xs truncate">
                        {provider.serviceCategories.length > 0
                          ? provider.serviceCategories.map((s) => s.name).join(", ")
                          : "None"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        <span className="font-semibold">{provider.ratingAggregate.toFixed(1)}</span>
                        <span className="text-muted-foreground">({provider.totalReviewCount})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={provider.verificationStatus} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/admin/verifications/${provider.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{" "}
              {totalCount} providers
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <div className="px-2 font-medium text-foreground">
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
