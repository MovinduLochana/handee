import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { jobRequestApi } from "../../api/jobRequests";
import { agentWorkflowApi } from "../../api/agentWorkflow";
import { BASE_URL } from "../../lib/api";
import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import LoadError from "../../components/booking/LoadError";
import { formatDateTime, formatMoney } from "../../components/booking/format";
import { getHttpStatus, retryUnlessClientError } from "../../components/booking/httpStatus";
import "./VerificationQueue.css";
import "./BookingAdmin.css";

function photoSrc(url: string): string {
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function JobRequestDetail() {
  const { id } = useParams<{ id: string }>();

  const {
    data: job,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["jobRequests", "detail", id],
    queryFn: () => jobRequestApi.getById(id!),
    enabled: !!id,
    retry: retryUnlessClientError,
  });

  const [expandedSteps, setExpandedSteps] = useState<Record<string | number, boolean>>({});
  const toggleStep = (key: string | number) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { data: workflow, isLoading: isWorkflowLoading } = useQuery({
    queryKey: ["agentWorkflow", "byJob", id],
    queryFn: () => agentWorkflowApi.getByJobId(id!),
    enabled: !!id,
    retry: false,
  });

  const backLink = (
    <Link to="/admin/job-requests" className="booking-back-link">
      <ArrowLeft size={16} /> Back to Job Requests
    </Link>
  );

  if (isLoading)
    return <div style={{ padding: "4rem", textAlign: "center" }}>Loading job request...</div>;

  if (isError && getHttpStatus(error) === 404)
    return (
      <div className="admin-page-container">
        {backLink}
        <div className="booking-state">Job request not found.</div>
      </div>
    );

  if (isError || !job)
    return (
      <div className="admin-page-container">
        {backLink}
        <LoadError title="Couldn't load this job request" error={error} onRetry={() => refetch()} />
      </div>
    );

  const budget =
    job.budgetMin === null && job.budgetMax === null
      ? "Not specified"
      : `${formatMoney(job.budgetMin)} – ${formatMoney(job.budgetMax)}`;

  return (
    <div className="admin-page-container animate-fade-up">
      {backLink}

      <header className="admin-header">
        <div>
          <div className="booking-title-row">
            <h1 className="admin-title">{job.categoryName}</h1>
            <BookingStatusBadge status={job.status} />
          </div>
          <p className="admin-subtitle booking-mono">Job request {job.id}</p>
        </div>
      </header>

      <div className="booking-detail-grid">
        <section className="booking-card">
          <h2>Request</h2>
          <dl className="booking-fields">
            <dt>Category</dt>
            <dd>{job.categoryName}</dd>
            <dt>Category ID</dt>
            <dd className="booking-mono">{job.serviceCategoryId}</dd>
            <dt>Location</dt>
            <dd>{job.location}</dd>
            <dt>Urgency</dt>
            <dd>
              <span className={`booking-urgency-${job.urgency.toLowerCase()}`}>{job.urgency}</span>
            </dd>
            <dt>Budget</dt>
            <dd>{budget}</dd>
            <dt>Status</dt>
            <dd>
              <BookingStatusBadge status={job.status} size="sm" />
            </dd>
          </dl>
        </section>

        <section className="booking-card">
          <h2>Customer & Timeline</h2>
          <dl className="booking-fields">
            <dt>Customer ID</dt>
            <dd className="booking-mono">{job.customerId}</dd>
            <dt>Submitted</dt>
            <dd>{formatDateTime(job.createdAt)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDateTime(job.updatedAt, "Never")}</dd>
          </dl>
        </section>

        <section className="booking-card" style={{ gridColumn: "1 / -1" }}>
          <h2>Description</h2>
          <p className="booking-description">{job.description}</p>
        </section>

        <section className="booking-card" style={{ gridColumn: "1 / -1" }}>
          <h2>Photos ({job.photoUrls.length})</h2>
          {job.photoUrls.length === 0 ? (
            <p className="booking-description">No photos attached.</p>
          ) : (
            <div className="booking-photo-list">
              {job.photoUrls.map((url, i) => (
                <a key={url} href={photoSrc(url)} target="_blank" rel="noreferrer">
                  <img src={photoSrc(url)} alt={`Job photo ${i + 1}`} loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </section>

        {/* ── AI Agent Dispatch Workflow Section ── */}
        <section className="booking-card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <Bot size={20} color="var(--accent)" /> AI Dispatch & Multi-Agent Analysis
            </h2>
            <Link
              to="/admin/agent-workflow"
              className="table-action-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              Governance Portal <ExternalLink size={13} />
            </Link>
          </div>

          {isWorkflowLoading ? (
            <p className="booking-description">Loading agent dispatch workflow...</p>
          ) : !workflow ? (
            <div style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px dashed var(--border)" }}>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                No multi-agent dispatch workflow has been processed for this job request yet.
              </p>
            </div>
          ) : (
            <div>
              <dl className="booking-fields" style={{ marginBottom: "1.25rem" }}>
                <dt>Objective</dt>
                <dd style={{ fontWeight: 600, color: "var(--text-h)" }}>{workflow.objective}</dd>

                <dt>Validation Tier</dt>
                <dd>
                  <span
                    style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      backgroundColor:
                        workflow.validationTier === "approved_for_auto_dispatch"
                          ? "rgba(34, 197, 94, 0.12)"
                          : workflow.validationTier === "approved_with_audit"
                          ? "rgba(59, 130, 246, 0.12)"
                          : "rgba(239, 68, 68, 0.12)",
                      color:
                        workflow.validationTier === "approved_for_auto_dispatch"
                          ? "#22c55e"
                          : workflow.validationTier === "approved_with_audit"
                          ? "#3b82f6"
                          : "#ef4444",
                    }}
                  >
                    {workflow.validationTier}
                  </span>
                </dd>

                <dt>Approval Status</dt>
                <dd>
                  <span
                    style={{
                      textTransform: "capitalize",
                      fontWeight: 600,
                      color:
                        workflow.approvalStatus.toLowerCase() === "approved"
                          ? "#22c55e"
                          : workflow.approvalStatus.toLowerCase() === "pending"
                          ? "#eab308"
                          : "#ef4444",
                    }}
                  >
                    {workflow.approvalStatus}
                  </span>
                </dd>

                <dt>Matched Provider</dt>
                <dd>
                  {workflow.selectedProviderName ? (
                    <span style={{ fontWeight: 600, color: "var(--text-h)" }}>
                      {workflow.selectedProviderName} ({workflow.selectedProviderId ? String(workflow.selectedProviderId).slice(0, 8) : "N/A"})
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>None assigned</span>
                  )}
                </dd>

                <dt>AI Estimated Price</dt>
                <dd style={{ fontWeight: 700, color: "var(--accent)" }}>
                  {workflow.estimatedPrice ? `LKR ${workflow.estimatedPrice.toLocaleString()}` : "Not estimated"}
                </dd>

                {workflow.decidedAt && (
                  <>
                    <dt>Decided At</dt>
                    <dd>{formatDateTime(workflow.decidedAt)}</dd>
                  </>
                )}

                {workflow.decisionNote && (
                  <>
                    <dt>Decision Note</dt>
                    <dd>{workflow.decisionNote}</dd>
                  </>
                )}
              </dl>

              {/* Step Logs */}
              {workflow.stepLogs && workflow.stepLogs.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-h)" }}>
                    Multi-Agent Execution Pipeline ({workflow.stepLogs.length} Steps)
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {workflow.stepLogs.map((step) => {
                      const isExpanded = !!expandedSteps[step.stepNumber];
                      return (
                        <div
                          key={step.id || step.stepNumber}
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--bg)",
                          }}
                        >
                          <div
                            onClick={() => toggleStep(step.stepNumber)}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "50%",
                                  backgroundColor: "var(--accent)",
                                  color: "#fff",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                }}
                              >
                                {step.stepNumber}
                              </span>
                              <span style={{ fontWeight: 600, color: "var(--text-h)", fontSize: "0.9rem" }}>
                                {step.agentName}
                              </span>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                · {step.action}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {step.durationMs}ms
                              </span>
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div
                              style={{
                                marginTop: "0.75rem",
                                paddingTop: "0.75rem",
                                borderTop: "1px solid var(--border)",
                                fontSize: "0.8rem",
                                fontFamily: "monospace",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                              }}
                            >
                              {step.inputData && (
                                <div>
                                  <div style={{ fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                                    Input Payload:
                                  </div>
                                  <pre
                                    style={{
                                      margin: 0,
                                      padding: "0.5rem",
                                      backgroundColor: "var(--bg-surface)",
                                      borderRadius: "6px",
                                      overflowX: "auto",
                                      whiteSpace: "pre-wrap",
                                    }}
                                  >
                                    {step.inputData}
                                  </pre>
                                </div>
                              )}
                              {step.outputData && (
                                <div>
                                  <div style={{ fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                                    Output Result:
                                  </div>
                                  <pre
                                    style={{
                                      margin: 0,
                                      padding: "0.5rem",
                                      backgroundColor: "var(--bg-surface)",
                                      borderRadius: "6px",
                                      overflowX: "auto",
                                      whiteSpace: "pre-wrap",
                                    }}
                                  >
                                    {step.outputData}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
