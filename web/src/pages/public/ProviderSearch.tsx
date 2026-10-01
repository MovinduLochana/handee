import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceCategoryApi } from "../../api/serviceCategories";
import type {
  ProviderSearchParams,
  PagedResult,
  ProviderProfileCustomerDto,
} from "../../api/types";
import ProviderCard from "../../components/provider/ProviderCard";
import PublicNavbar from "../../components/layout/PublicNavbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProviderSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceCategoryId, setServiceCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [appliedFilters, setAppliedFilters] = useState<ProviderSearchParams>({
    status: "Verified",
    page: 1,
    pageSize,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["serviceCategories"],
    queryFn: serviceCategoryApi.getServiceCategories,
  });

  const {
    data: searchResults,
    isLoading: searchLoading,
    isError,
  } = useQuery<PagedResult<ProviderProfileCustomerDto>>({
    queryKey: ["providerSearch", appliedFilters],
    queryFn: () => providerApi.search(appliedFilters),
  });

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newFilters: ProviderSearchParams = {
      status: "Verified",
      searchTerm: searchTerm || undefined,
      serviceCategoryId: serviceCategoryId || undefined,
      page: 1,
      pageSize,
    };
    setAppliedFilters(newFilters);
    setPage(1);
  };

  const handleClear = () => {
    setSearchTerm("");
    setServiceCategoryId("");
    const newFilters: ProviderSearchParams = {
      status: "Verified",
      page: 1,
      pageSize,
    };
    setAppliedFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setAppliedFilters({ ...appliedFilters, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNavbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* HERO & SEARCH BAR */}
        <header className="space-y-6">
          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Find a Professional
            </h1>
            <p className="text-sm text-muted-foreground">
              {searchResults
                ? `Showing ${searchResults.items.length} of ${searchResults.totalCount} results`
                : "Loading professionals..."}
            </p>
          </div>

          <Card className="rounded-none border-border">
            <CardContent className="p-4">
              <form
                onSubmit={handleSearch}
                className="flex flex-col md:flex-row gap-3 items-stretch md:items-center"
              >
                <div className="flex-1 relative">
                  <Input
                    id="searchTerm"
                    type="text"
                    placeholder="What service do you need?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="w-full md:w-64">
                  <select
                    id="category"
                    value={serviceCategoryId}
                    onChange={(e) => setServiceCategoryId(e.target.value)}
                    disabled={categoriesLoading}
                    className="w-full h-9 rounded-none border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  >
                    <option value="">Any Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {(searchTerm || serviceCategoryId) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleClear}
                      title="Clear Filters"
                      className="shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  <Button type="submit" className="w-full md:w-auto gap-2">
                    <Search className="w-4 h-4" /> Search
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </header>

        {/* Main Content Grid */}
        <main>
          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Finding matching providers...</p>
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive">
              Failed to fetch providers. Please try again.
            </div>
          ) : searchResults?.items.length === 0 ? (
            <Card className="rounded-none border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center text-center p-12 space-y-4">
                <Search className="w-12 h-12 text-muted-foreground/60" />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    No providers match your search
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search keywords or broadening your category.
                  </p>
                </div>
                <Button onClick={handleClear}>Clear Filters</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults?.items.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>

              {/* Enhanced Pagination */}
              {searchResults && searchResults.totalCount > pageSize && (
                <div className="flex items-center justify-center gap-4 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    Page {page} of {Math.ceil(searchResults.totalCount / pageSize)}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= Math.ceil(searchResults.totalCount / pageSize)}
                    onClick={() => handlePageChange(page + 1)}
                    className="gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
