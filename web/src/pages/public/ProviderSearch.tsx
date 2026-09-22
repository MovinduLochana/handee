import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceCategoryApi } from "../../api/serviceCategories";
import type {
  ProviderSearchParams,
  PagedResult,
  ProviderProfileCustomerDto,
} from "../../api/types";
import ProviderCard from "../../components/provider/ProviderCard";
import PublicNavbar from "../../components/layout/PublicNavbar";
import "./ProviderSearch.css";

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
    <div className="page-container">
      <PublicNavbar />

      <div className="provider-search-layout animate-fade-up">
        {/* HERO EXPEREINCE */}
        <header className="search-hero">
          <div className="provider-search-header">
            <h1>Find a Professional</h1>
            <p>
              {searchResults
                ? `Showing ${searchResults.items.length} of ${searchResults.totalCount} results`
                : "Loading professionals..."}
            </p>
          </div>

          <form onSubmit={handleSearch} className="search-pill-container">
            <div className="search-segment">
              <input
                id="searchTerm"
                type="text"
                className="search-pill-input"
                placeholder="What service do you need?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="search-segment">
              <select
                id="category"
                className="search-pill-select"
                value={serviceCategoryId}
                onChange={(e) => {
                  setServiceCategoryId(e.target.value);
                  // auto trigger search if needed, but manual is fine for unified bar too
                }}
                disabled={categoriesLoading}
              >
                <option value="">Any Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-segment-actions">
              {(searchTerm || serviceCategoryId) && (
                <button
                  type="button"
                  className="clear-btn-pill"
                  onClick={handleClear}
                  title="Clear Filters"
                >
                  <X size={18} />
                </button>
              )}
              <button type="submit" className="search-btn-pill">
                <Search size={18} /> Search
              </button>
            </div>
          </form>
        </header>

        {/* Main Content Grid */}
        <main className="provider-search-main">
          {searchLoading ? (
            <div
              className="state-container animate-pulse-gentle"
              style={{ margin: "4rem auto" }}
            ></div>
          ) : isError ? (
            <div className="state-error">Failed to fetch providers. Please try again.</div>
          ) : searchResults?.items.length === 0 ? (
            <div className="empty-state">
              <Search size={48} className="empty-state-icon" />
              <h3>No providers match your search</h3>
              <p>Try adjusting your search keywords or broadening your category.</p>
              <button
                className="wizard-btn wizard-btn-primary"
                style={{ marginTop: "1.5rem" }}
                onClick={handleClear}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="provider-grid">
                {searchResults?.items.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>

              {/* Enhanced Pagination */}
              {searchResults && searchResults.totalCount > pageSize && (
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>

                  <span className="pagination-info">
                    Page {page} of {Math.ceil(searchResults.totalCount / pageSize)}
                  </span>

                  <button
                    className="pagination-btn"
                    disabled={page >= Math.ceil(searchResults.totalCount / pageSize)}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
