import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Star, Eye } from "lucide-react";
import { providerApi } from "../../api/providers";
import { skillCategoryApi } from "../../api/skillCategories";
import StatusBadge from "../../components/provider/StatusBadge";
import type { VerificationStatus } from "../../api/types";
import "./ProviderDirectory.css";

export default function ProviderDirectory() {
  // Search State
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "">("");
  const [skillFilter, setSkillFilter] = useState("");

  // Values to trigger query refetch on Search click
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    status: "" as VerificationStatus | "",
    skill: "",
  });

  const pageSize = 15;

  const { data: categories = [] } = useQuery({
    queryKey: ["skillCategories"],
    queryFn: skillCategoryApi.getSkillCategories,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["providerSearch", page, appliedFilters],
    queryFn: () =>
      providerApi.search({
        page,
        pageSize,
        searchTerm: appliedFilters.searchTerm || undefined,
        status: appliedFilters.status || undefined,
        skillCategoryId: appliedFilters.skill || undefined,
      }),
  });

  const handleSearch = () => {
    setPage(1);
    setAppliedFilters({ searchTerm, status: statusFilter, skill: skillFilter });
  };

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="directory-container animate-fade-up">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Provider Directory</h1>
          <p className="admin-subtitle">Search and manage all providers on the Handee platform.</p>
        </div>
      </header>

      <div className="directory-toolbar animate-fade-up">
        <div className="filter-group">
          <label>Search Provider</label>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 12, top: 13, color: "var(--text-muted)" }}
            />
            <input
              type="text"
              className="filter-input"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Name, email, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select
            className="filter-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VerificationStatus | "")}
          >
            <option value="">All Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="InReview">In Review</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Skill Category</label>
          <select
            className="filter-input"
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

        <button className="filter-btn" onClick={handleSearch}>
          <Search size={16} /> Search
        </button>
      </div>

      <div className="directory-table-card animate-fade-up animate-delay-100">
        <table className="directory-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Contact / Location</th>
              <th>Skills</th>
              <th>Rating</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}>
                  Loading directory...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}>
                  No providers found.
                </td>
              </tr>
            ) : (
              items.map((provider) => (
                <tr key={provider.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {provider.profilePictureUrl ? (
                        <img
                          src={`http://localhost:5057${provider.profilePictureUrl}`}
                          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                          alt={provider.fullName}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "var(--bg-surface-elevated)",
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                          }}
                        >
                          {provider.fullName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-h)" }}>
                          {provider.fullName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          ID: {provider.id.split("-")[0]}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          marginBottom: "4px",
                        }}
                      >
                        <MapPin size={12} color="var(--text-muted)" />{" "}
                        {provider.serviceAreaDisplayName || "N/A"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {provider.skillCategories.length > 0
                        ? provider.skillCategories.map((s) => s.name).join(", ")
                        : "None"}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Star size={14} fill="#F59E0B" color="#F59E0B" />
                      <span style={{ fontWeight: 600 }}>{provider.ratingAggregate.toFixed(1)}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        ({provider.totalReviewCount})
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={provider.verificationStatus} size="sm" />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link to={`/admin/verifications/${provider.id}`} className="table-action-btn">
                      <Eye size={14} /> View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!isLoading && totalPages > 1 && (
          <div className="directory-pagination">
            <div className="pagination-info">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{" "}
              {totalCount} providers
            </div>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 0.5rem",
                  fontWeight: 600,
                }}
              >
                {page} / {totalPages}
              </div>
              <button
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
