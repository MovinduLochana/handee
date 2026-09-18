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
} from "lucide-react";
import { providerApi } from "../../api/providers";
import type { ProviderProfileAdminDto, VerificationActionDto } from "../../api/types";
import StatusBadge from "../../components/provider/StatusBadge";
import DocumentCard from "../../components/provider/DocumentCard";
import "./VerificationDetail.css";

export default function VerificationDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["adminProviderProfile", id],
    queryFn: () => providerApi.getProfile(id!) as Promise<ProviderProfileAdminDto>,
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: VerificationActionDto) => {
      if (!id) throw new Error("No id");
      await providerApi.updateVerification(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProviderProfile", id] });
      setIsRejectModalOpen(false);
      setRejectNote("");
    },
  });

  const documentReviewMutation = useMutation({
    mutationFn: async ({ certId, status }: { certId: string; status: "Approved" | "Rejected" }) => {
      await providerApi.reviewCertification(certId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProviderProfile", id] });
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
              <CheckCircle size={18} /> Approve & Verify
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
                      onApprove={(id) =>
                        documentReviewMutation.mutate({ certId: id, status: "Approved" })
                      }
                      onReject={(id) =>
                        documentReviewMutation.mutate({ certId: id, status: "Rejected" })
                      }
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
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status Change</th>
                      <th>Note</th>
                      <th>Admin ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...profile.auditLogs]
                      .sort(
                        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                      )
                      .map((log) => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {new Date(log.timestamp).toLocaleString("en-LK", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {log.previousStatus !== log.newStatus ? (
                                <>
                                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                    {log.previousStatus}
                                  </span>
                                  <span style={{ color: "var(--text-muted)" }}>→</span>
                                  <StatusBadge status={log.newStatus} size="sm" />
                                </>
                              ) : (
                                (() => {
                                  const docApproved = log.note?.includes("status set to Approved");
                                  const docRejected = log.note?.includes("status set to Rejected");
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
                          <td style={{ maxWidth: 300 }}>{log.note || "-"}</td>
                          <td style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                            {log.adminUserId.split("-")[0]}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

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
                disabled={!rejectNote.trim()}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
