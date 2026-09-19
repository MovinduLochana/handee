import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, AlertOctagon, CheckCircle } from "lucide-react";
import { adminApi } from "../../api/admin";
import StatusBadge from "../../components/provider/StatusBadge";
import type { VerificationStatus } from "../../api/types";
import "./VerificationQueue.css";

export default function VerificationQueue() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "All">("Pending");

  const { data: queueData, isLoading: isLoadingQueue } = useQuery({
    queryKey: ["verificationQueue", statusFilter],
    queryFn: () =>
      adminApi.getVerificationQueue({
        status: statusFilter === "All" ? undefined : statusFilter,
        page: 1,
        pageSize: 50,
      }),
  });

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["verificationSummary"],
    queryFn: () => adminApi.getVerificationSummary(),
  });

  const items = queueData?.items || [];

  const kpis = {
    pending: summaryData?.Pending || 0,
    inReview: summaryData?.InReview || 0,
    verified: summaryData?.Verified || 0,
    rejected: summaryData?.Rejected || 0,
  };

  const isLoading = isLoadingQueue || isLoadingSummary;

  if (isLoading) return <div style={{ padding: "2rem" }}>Loading queue...</div>;

  return (
    <div className="admin-page-container animate-fade-up">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Verification Queue</h1>
          <p className="admin-subtitle">Review and process provider applications.</p>
        </div>
      </header>

      <div className="kpi-grid">
        <button
          type="button"
          className="kpi-card kpi-pending hover-lift"
          onClick={() => setStatusFilter("Pending")}
          style={{
            cursor: "pointer",
            textAlign: "left",
            background: "transparent",
            border: "none",
            font: "inherit",
            color: "inherit",
          }}
        >
          <div className="kpi-icon">
            <Clock size={24} />
          </div>
          <div>
            <div className="kpi-value">{kpis.pending}</div>
            <div className="kpi-label">Pending Review</div>
          </div>
        </button>
        <button
          type="button"
          className="kpi-card kpi-review hover-lift"
          onClick={() => setStatusFilter("InReview")}
          style={{
            cursor: "pointer",
            textAlign: "left",
            background: "transparent",
            border: "none",
            font: "inherit",
            color: "inherit",
          }}
        >
          <div className="kpi-icon">
            <Users size={24} />
          </div>
          <div>
            <div className="kpi-value">{kpis.inReview}</div>
            <div className="kpi-label">Currently In Review</div>
          </div>
        </button>
        <button
          type="button"
          className="kpi-card kpi-verified hover-lift"
          onClick={() => setStatusFilter("Verified")}
          style={{
            cursor: "pointer",
            textAlign: "left",
            background: "transparent",
            border: "none",
            font: "inherit",
            color: "inherit",
          }}
        >
          <div className="kpi-icon">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="kpi-value">{kpis.verified}</div>
            <div className="kpi-label">Total Verified</div>
          </div>
        </button>
        <button
          type="button"
          className="kpi-card kpi-rejected hover-lift"
          onClick={() => setStatusFilter("Rejected")}
          style={{
            cursor: "pointer",
            textAlign: "left",
            background: "transparent",
            border: "none",
            font: "inherit",
            color: "inherit",
          }}
        >
          <div className="kpi-icon">
            <AlertOctagon size={24} />
          </div>
          <div>
            <div className="kpi-value">{kpis.rejected}</div>
            <div className="kpi-label">Total Rejected</div>
          </div>
        </button>
      </div>

      <div className="admin-table-card animate-fade-up animate-delay-100">
        <div className="table-toolbar">
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="InReview">In Review</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Skills</th>
              <th>Signed Up</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "3rem" }}>
                  <div style={{ color: "var(--text-muted)" }}>
                    No providers found matching this filter.
                  </div>
                </td>
              </tr>
            ) : (
              items.map((provider) => (
                <tr key={provider.id}>
                  <td>
                    <div className="provider-cell">
                      {provider.profilePictureUrl ? (
                        <img
                          src={`http://localhost:5057${provider.profilePictureUrl}`}
                          alt={`${provider.fullName} avatar`}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "var(--accent)",
                            color: "#fff",
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
                        <div className="provider-name">{provider.fullName}</div>
                        <div className="provider-sub truncate" style={{ maxWidth: 200 }}>
                          {provider.serviceAreaDisplayName || "No location set"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {provider.skillCategories.slice(0, 2).map((s) => (
                        <span
                          key={s.id}
                          style={{
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            background: "var(--bg-surface-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                          }}
                        >
                          {s.name}
                        </span>
                      ))}
                      {provider.skillCategories.length > 2 && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            color: "var(--text-muted)",
                          }}
                        >
                          +{provider.skillCategories.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem" }}>
                      {new Date(provider.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={provider.verificationStatus} size="sm" />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="wizard-btn wizard-btn-secondary"
                      onClick={() => navigate(`/admin/verifications/${provider.id}`)}
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
