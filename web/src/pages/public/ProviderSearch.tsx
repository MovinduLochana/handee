import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, RefreshCcw } from "lucide-react";
import { providerApi } from "../../api/providers";
import { skillCategoryApi } from "../../api/skillCategories";
import type {
  ProviderSearchParams,
  PagedResult,
  ProviderProfileCustomerDto,
} from "../../api/types";
import ProviderCard from "../../components/provider/ProviderCard";
import PublicNavbar from "../../components/layout/PublicNavbar";
import "./ProviderSearch.css";

export default function ProviderSearch() {
  // URL or state-based filters
  const [searchTerm, setSearchTerm] = useState("");
  const [skillCategoryId, setSkillCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // We keep a separate applied filter state so the query only runs when we hit "Search"
  const [appliedFilters, setAppliedFilters] = useState<ProviderSearchParams>({
    status: "Verified",
    page: 1,
    pageSize,
  });

  // Fetch categories for the filter sidebar
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["skillCategories"],
    queryFn: skillCategoryApi.getSkillCategories,
  });

  // Fetch providers based on applied filters
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
      skillCategoryId: skillCategoryId || undefined,
      page: 1, // Reset to page 1 on new search
      pageSize,
    };
    setAppliedFilters(newFilters);
    setPage(1);
  };

  const handleClear = () => {
    setSearchTerm("");
    setSkillCategoryId("");
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
        {/* Sidebar Filters */}
        <aside className="provider-search-sidebar">
          <div className="sidebar-header">
            <Filter size={18} /> Filters
          </div>

          <form onSubmit={handleSearch}>
            <div className="search-field">
              <label htmlFor="searchTerm">Keywords</label>
              <input
                id="searchTerm"
                type="text"
                placeholder="e.g. Plumber, Electrician..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="search-field">
              <label htmlFor="category">Service Category</label>
              <select
                id="category"
                value={skillCategoryId}
                onChange={(e) => setSkillCategoryId(e.target.value)}
                disabled={categoriesLoading}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-actions">
              <button
                type="button"
                className="clear-btn"
                onClick={handleClear}
                title="Clear Filters"
              >
                <RefreshCcw size={16} />
              </button>
              <button type="submit" className="search-btn flex-center" style={{ gap: "0.5rem" }}>
                <Search size={16} /> Search
              </button>
            </div>
          </form>
        </aside>

        {/* Main Content Area */}
        <main className="provider-search-main">
          <header className="provider-search-header">
            <h1>Find a Professional</h1>
            <p>
              {searchResults
                ? `Showing ${searchResults.items.length} of ${searchResults.totalCount} results`
                : "Loading professionals..."}
            </p>
          </header>

          {searchLoading ? (
            <div className="state-container">Searching...</div>
          ) : isError ? (
            <div className="state-error">Failed to fetch providers. Please try again.</div>
          ) : searchResults?.items.length === 0 ? (
            <div className="empty-state">
              <Search size={32} className="empty-state-icon" />
              <h3>No providers found</h3>
              <p>Try adjusting your search keywords or filters.</p>
            </div>
          ) : (
            <>
              <div className="provider-grid">
                {searchResults?.items.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>

              {/* Pagination */}
              {searchResults && searchResults.totalCount > pageSize && (
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    Previous
                  </button>

                  <span className="pagination-info">
                    Page {page} of {Math.ceil(searchResults.totalCount / pageSize)}
                  </span>

                  <button
                    className="pagination-btn"
                    disabled={page >= Math.ceil(searchResults.totalCount / pageSize)}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Next
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
