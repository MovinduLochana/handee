import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  User,
  MapPin,
  Briefcase,
  FileText,
  CheckCircle,
  XCircle,
  Search,
  Clock,
  AlertTriangle,
  Eye,
  X,
} from "lucide-react";
import { providerApi } from "../../api/providers";
import type {
  ProviderProfileAdminDto,
  VerificationActionDto,
  CertificationDto,
  AuditLogDto,
} from "../../api/types";
import StatusBadge from "../../components/provider/StatusBadge";
import DocumentCard from "../../components/provider/DocumentCard";
import { extractApiError } from "../../lib/api";

export default function VerificationDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Document review states
  const [approvingCert, setApprovingCert] = useState<CertificationDto | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [rejectingCert, setRejectingCert] = useState<CertificationDto | null>(null);
  const [rejectDocNote, setRejectDocNote] = useState("");
  const [viewingAuditLog, setViewingAuditLog] = useState<AuditLogDto | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["adminProviderProfile", id],
    queryFn: () => providerApi.getProfile(id!) as Promise<ProviderProfileAdminDto>,
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: VerificationActionDto) => {
      if (!id) throw new Error("No id");
      await providerApi.updateVerification(id, payload);
      return payload;
    },
    onSuccess: async (payload) => {
      setErrorMessage(null);
      // Immediately update local cache so the UI transitions instantly (0ms lag)
      queryClient.setQueryData<ProviderProfileAdminDto>(["adminProviderProfile", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          verificationStatus: payload.newStatus,
        };
      });

      setIsRejectModalOpen(false);
      setRejectNote("");

      // Refetch to sync fresh server audit logs & status
      await queryClient.invalidateQueries({ queryKey: ["adminProviderProfile", id] });
      await queryClient.refetchQueries({ queryKey: ["adminProviderProfile", id] });

      // Invalidate the queue list and summary KPI counters so navigating back is fresh
      await queryClient.invalidateQueries({ queryKey: ["verificationQueue"] });
      await queryClient.invalidateQueries({ queryKey: ["verificationSummary"] });
    },
    onError: (err) => {
      setErrorMessage(extractApiError(err, "Failed to update verification status."));
    },
  });

  const documentReviewMutation = useMutation({
    mutationFn: async ({
      certId,
      status,
      note,
    }: {
      certId: string;
      status: "Approved" | "Rejected";
      note?: string;
    }) => {
      await providerApi.reviewCertification(certId, status, note);
      return { certId, status };
    },
    onSuccess: async ({ certId, status }) => {
      setErrorMessage(null);
      // Immediately update certification status in cache
      queryClient.setQueryData<ProviderProfileAdminDto>(["adminProviderProfile", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          certifications: old.certifications.map((c) =>
            c.id === certId ? { ...c, reviewStatus: status } : c,
          ),
        };
      });

      await queryClient.invalidateQueries({ queryKey: ["adminProviderProfile", id] });
      await queryClient.refetchQueries({ queryKey: ["adminProviderProfile", id] });
    },
    onError: (err) => {
      setErrorMessage(extractApiError(err, "Failed to update document review status."));
    },
  });

  if (isLoading)
    return <div style={{ padding: "4rem", textAlign: "center" }}>Loading provider detail...</div>;

  if (!profile)
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        Provider not found. <Link to="/admin/verifications">Back to Queue</Link>
      </div>
    );

  const isPending = profile.verificationStatus === "Pending";
  const isInReview = profile.verificationStatus === "InReview";

  return (
    <div className="admin-page-container animate-fade-up">
      <Link
        to="/admin/verifications"
        className="public-back-btn"
        style={{ marginBottom: "1.5rem" }}
      >
        <ArrowLeft size={16} /> Back to Queue
      </Link>

      <div className="admin-detail-layout">
        {/* ── Left Sidebar ── */}
        <aside className="detail-sidebar">
          <div className="provider-summary-card">
            {profile.profilePictureUrl ? (
              <img
                src={`http://localhost:5057${profile.profilePictureUrl}`}
                alt={profile.fullName}
                className="provider-summary-avatar"
              />
            ) : (
              <div
                className="provider-summary-avatar"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.5rem",
                  fontWeight: 700,
                }}
              >
                {profile.fullName.charAt(0)}
              </div>
            )}

            <h1 className="provider-summary-name">{profile.fullName}</h1>
            <p className="provider-summary-headline">{profile.headline || "No headline set"}</p>

            <StatusBadge status={profile.verificationStatus} size="lg" />

            <div className="provider-mini-stats">
              <div className="mini-stat">
                <Briefcase size={18} className="mini-stat-icon" />
                <div className="mini-stat-content">
                  <h5>Experience</h5>
                  <p>{profile.yearsOfExperience} Years</p>
                </div>
              </div>
              <div className="mini-stat">
                <MapPin size={18} className="mini-stat-icon" />
                <div className="mini-stat-content">
                  <h5>Location</h5>
                  <p>{profile.serviceAreaDisplayName || "Unknown"}</p>
                </div>
              </div>
              <div className="mini-stat">
                <User size={18} className="mini-stat-icon" />
                <div className="mini-stat-content">
                  <h5>Member Since</h5>
                  <p>{new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-action-panel">
            <h3>Verification Actions</h3>

            {errorMessage && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-danger, #fee2e2)",
                  color: "var(--text-danger, #b91c1c)",
                  fontSize: "0.85rem",
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Legal Admin Transitions:
                Pending -> InReview, Verified, Rejected
                InReview -> Verified, Rejected
            */}
            <button
              className="panel-btn btn-start-review"
              disabled={!isPending || statusMutation.isPending}
              onClick={() => statusMutation.mutate({ newStatus: "InReview" })}
            >
              <Search size={18} />
              {statusMutation.isPending ? "Processing..." : "Start Review"}
            </button>

            <button
              className="panel-btn btn-approve"
              disabled={(!isPending && !isInReview) || statusMutation.isPending}
              onClick={() => statusMutation.mutate({ newStatus: "Verified" })}
            >
              <CheckCircle size={18} />
              {statusMutation.isPending ? "Processing..." : "Approve & Verify"}
            </button>

            <button
              className="panel-btn btn-reject"
              disabled={(!isPending && !isInReview) || statusMutation.isPending}
              onClick={() => setIsRejectModalOpen(true)}
            >
              <XCircle size={18} /> Reject Application
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="detail-main">
          <div className="workspace-card">
            <div className="workspace-header">
              <FileText size={20} />
              <h2>Submitted Documents</h2>
            </div>
            <div className="workspace-body">
              {profile.certifications.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No documents uploaded.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {profile.certifications.map((cert) => (
                    <DocumentCard
                      key={cert.id}
                      certification={cert}
                      showActions={true}
                      onApprove={() => {
                        setApprovingCert(cert);
                        setApproveNote("");
                      }}
                      onReject={() => {
                        setRejectingCert(cert);
                        setRejectDocNote("");
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-header">
              <Clock size={20} />
              <h2>Audit Trail</h2>
            </div>
            <div className="workspace-body">
              {profile.auditLogs.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No audit history available.</p>
              ) : (
                <div className="audit-table-container">
                  <table className="data-table audit-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status Change</th>
                        <th>Note</th>
                        <th>Admin</th>
                        <th style={{ textAlign: "right" }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...profile.auditLogs]
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                        )
                        .map((log) => (
                          <tr key={log.id}>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {new Date(log.timestamp).toLocaleString("en-LK", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {log.previousStatus !== log.newStatus ? (
                                  <>
                                    <span
                                      style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                                    >
                                      {log.previousStatus}
                                    </span>
                                    <span style={{ color: "var(--text-muted)" }}>→</span>
                                    <StatusBadge status={log.newStatus} size="sm" />
                                  </>
                                ) : (
                                  (() => {
                                    const docApproved =
                                      log.note?.includes("status set to Approved");
                                    const docRejected =
                                      log.note?.includes("status set to Rejected");
                                    return (
                                      <span
                                        style={{
                                          fontWeight: 600,
                                          padding: "4px 10px",
                                          borderRadius: "99px",
                                          fontSize: "0.75rem",
                                          backgroundColor: docApproved
                                            ? "var(--bg-success)"
                                            : docRejected
                                              ? "var(--bg-danger)"
                                              : "var(--bg-card)",
                                          color: docApproved
                                            ? "var(--text-success)"
                                            : docRejected
                                              ? "var(--text-danger)"
                                              : "var(--text-h)",
                                        }}
                                      >
                                        {docApproved
                                          ? "Approved"
                                          : docRejected
                                            ? "Rejected"
                                            : "Audit"}
                                      </span>
                                    );
                                  })()
                                )}
                              </div>
                            </td>
                            <td
                              className="audit-note-cell"
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "160px",
                                cursor: "pointer",
                              }}
                              title={log.note || ""}
                              onClick={() => setViewingAuditLog(log)}
                            >
                              {log.note || "-"}
                            </td>
                            <td
                              style={{
                                fontSize: "0.75rem",
                                fontFamily: "monospace",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {log.adminUserId.split("-")[0]}
                            </td>
                            <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                              <button
                                type="button"
                                className="audit-view-btn"
                                onClick={() => setViewingAuditLog(log)}
                                title="View audit details"
                              >
                                <Eye size={13} /> Details
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Audit Log Detail Modal */}
      {viewingAuditLog && (
        <div className="rejection-modal-backdrop" onClick={() => setViewingAuditLog(null)}>
          <div
            className="rejection-modal"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                  color: "var(--text-h)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Clock size={18} style={{ color: "var(--accent)" }} /> Audit Log Entry
              </h3>
              <button
                type="button"
                onClick={() => setViewingAuditLog(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1.25rem",
                padding: "1rem",
                background: "var(--bg-card, rgba(0,0,0,0.02))",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Timestamp
                </span>
                <p style={{ margin: "4px 0 0", fontSize: "0.875rem", fontWeight: 500 }}>
                  {new Date(viewingAuditLog.timestamp).toLocaleString("en-LK", {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}
                </p>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Status Transition
                </span>
                <div style={{ marginTop: "4px" }}>
                  {viewingAuditLog.previousStatus !== viewingAuditLog.newStatus ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {viewingAuditLog.previousStatus}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>→</span>
                      <StatusBadge status={viewingAuditLog.newStatus} size="sm" />
                    </div>
                  ) : (
                    (() => {
                      const docApproved = viewingAuditLog.note?.includes("status set to Approved");
                      const docRejected = viewingAuditLog.note?.includes("status set to Rejected");
                      return (
                        <span
                          style={{
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "99px",
                            fontSize: "0.75rem",
                            backgroundColor: docApproved
                              ? "var(--bg-success)"
                              : docRejected
                                ? "var(--bg-danger)"
                                : "var(--bg-card)",
                            color: docApproved
                              ? "var(--text-success)"
                              : docRejected
                                ? "var(--text-danger)"
                                : "var(--text-h)",
                          }}
                        >
                          {docApproved ? "Approved" : docRejected ? "Rejected" : "Document Audit"}
                        </span>
                      );
                    })()
                  )}
                </div>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Admin User ID
                </span>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    color: "var(--text-h)",
                  }}
                >
                  {viewingAuditLog.adminUserId}
                </p>
              </div>
            </div>

            <div className="wizard-field" style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Audit Note</label>
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background: "var(--bg, #f8fafc)",
                  border: "1px solid var(--border-strong, #cbd5e1)",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  color: "var(--text-h)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {viewingAuditLog.note || (
                  <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                    No note provided.
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="wizard-btn wizard-btn-secondary"
                style={{ minWidth: "100px" }}
                onClick={() => setViewingAuditLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="rejection-modal-backdrop">
          <div className="rejection-modal">
            <h3>Reject Application</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Please provide a reason for the rejection. This note will be visible to the provider
              so they can correct the issue and resubmit.
            </p>

            <div className="wizard-field">
              <label>Rejection Reason</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. The uploaded NIC is blurry and unreadable. Please upload a clearer copy."
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button
                className="wizard-btn wizard-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setIsRejectModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="wizard-btn"
                style={{
                  flex: 1,
                  background: "var(--bg-danger)",
                  color: "var(--text-danger)",
                  border: "1px solid var(--text-danger)",
                }}
                onClick={() => statusMutation.mutate({ newStatus: "Rejected", note: rejectNote })}
                disabled={!rejectNote.trim() || statusMutation.isPending}
              >
                {statusMutation.isPending ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Approval Modal with Note */}
      {approvingCert && (
        <div className="rejection-modal-backdrop">
          <div className="rejection-modal">
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckCircle size={20} style={{ color: "var(--success, #10b981)" }} /> Approve
              Submitted Document
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Approving <strong>{approvingCert.originalFileName || approvingCert.type}</strong> (
              {approvingCert.type}). You can optionally attach an approval note to this record.
            </p>

            <div className="wizard-field">
              <label>Approval Note (Optional)</label>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="e.g. Verified with national registry, document is valid and legible."
                rows={3}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                className="wizard-btn wizard-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setApprovingCert(null);
                  setApproveNote("");
                }}
              >
                Cancel
              </button>
              <button
                className="wizard-btn btn-approve"
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  background: "var(--success, #10b981)",
                  color: "#fff",
                }}
                onClick={() => {
                  documentReviewMutation.mutate(
                    {
                      certId: approvingCert.id,
                      status: "Approved",
                      note: approveNote.trim() || undefined,
                    },
                    {
                      onSuccess: () => {
                        setApprovingCert(null);
                        setApproveNote("");
                      },
                    },
                  );
                }}
                disabled={documentReviewMutation.isPending}
              >
                <CheckCircle size={16} />
                {documentReviewMutation.isPending ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Rejection Modal with Note */}
      {rejectingCert && (
        <div className="rejection-modal-backdrop">
          <div className="rejection-modal">
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <XCircle size={20} style={{ color: "var(--text-danger, #ef4444)" }} /> Reject
              Submitted Document
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Rejecting <strong>{rejectingCert.originalFileName || rejectingCert.type}</strong> (
              {rejectingCert.type}). Please provide a reason for rejecting this document.
            </p>

            <div className="wizard-field">
              <label>Rejection Reason (Optional)</label>
              <textarea
                value={rejectDocNote}
                onChange={(e) => setRejectDocNote(e.target.value)}
                placeholder="e.g. Document is expired, unreadable, or missing required details."
                rows={3}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                className="wizard-btn wizard-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setRejectingCert(null);
                  setRejectDocNote("");
                }}
              >
                Cancel
              </button>
              <button
                className="wizard-btn"
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  background: "var(--bg-danger)",
                  color: "var(--text-danger)",
                  border: "1px solid var(--text-danger)",
                }}
                onClick={() => {
                  documentReviewMutation.mutate(
                    {
                      certId: rejectingCert.id,
                      status: "Rejected",
                      note: rejectDocNote.trim() || undefined,
                    },
                    {
                      onSuccess: () => {
                        setRejectingCert(null);
                        setRejectDocNote("");
                      },
                    },
                  );
                }}
                disabled={documentReviewMutation.isPending}
              >
                <XCircle size={16} />
                {documentReviewMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
