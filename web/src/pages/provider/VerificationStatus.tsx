import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, CheckCircle, AlertOctagon } from "lucide-react";
import { providerApi } from "../../api/providers";
import { extractApiError } from "../../lib/api";
import StatusBadge from "../../components/provider/StatusBadge";
import DocumentCard from "../../components/provider/DocumentCard";
import "./VerificationStatus.css";

export default function VerificationStatusTracker() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    data: myProfile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["myProfile"],
    queryFn: providerApi.getMyProfile,
    retry: 1,
  });

  // Handle Rejected Resubmission line-by-line
  const resubmitMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: any }) => {
      if (!myProfile) throw new Error("No profile state");
      await providerApi.uploadDocument(myProfile.id, file, type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      setUploadError(null);
    },
    onError: (err) => {
      setUploadError(extractApiError(err, "Failed to upload document."));
    },
  });

  const handleResubmit = (file: File, type: string) => {
    resubmitMutation.mutate({ file, type });
  };

  if (isLoading) {
    return <div className="state-container">Loading status...</div>;
  }

  // If profile not found, errored, or fresh with no certs, show prompt to start verification
  if (
    isError ||
    !myProfile ||
    (myProfile.verificationStatus === "Pending" && (myProfile.certifications ?? []).length === 0)
  ) {
    return (
      <div className="empty-state verification-not-started animate-fade-up">
        <AlertOctagon size={48} className="empty-state-icon" style={{ opacity: 0.5 }} />
        <h2>Verification Not Started</h2>
        <p>
          You haven't submitted your verification documents yet. Please complete the setup wizard to
          verify your identity and start accepting jobs.
        </p>
        <button
          onClick={() => navigate("/provider/submit-verification")}
          className="wizard-btn wizard-btn-primary"
        >
          Start Verification
        </button>
      </div>
    );
  }

  const { verificationStatus, auditLogs = [], certifications = [] } = myProfile;

  // Determine hero UI based on status
  const getHeroConfig = () => {
    switch (verificationStatus) {
      case "Pending":
        return {
          icon: <Clock size={32} />,
          title: "Verification Pending",
          desc: "Your application has been received and is waiting for an administrator to begin the review process. Please check back later.",
          cssClass: "hero-pending",
        };
      case "InReview":
        return {
          icon: <CheckCircle size={32} />,
          title: "Application In Review",
          desc: "An administrator is currently reviewing your documents and profile details. We will notify you once a decision is made.",
          cssClass: "hero-review",
        };
      case "Verified":
        return {
          icon: <CheckCircle size={32} />,
          title: "You are verified!",
          desc: "Congratulations! Your profile is verified and visible to customers in our marketplace. You can now accept jobs.",
          cssClass: "hero-verified",
        };
      case "Rejected":
        return {
          icon: <AlertOctagon size={32} />,
          title: "Verification Rejected",
          desc: "Unfortunately, your application was rejected. Please review the notes below and resubmit updated documents.",
          cssClass: "hero-rejected",
        };
      default:
        return {
          icon: <Clock size={32} />,
          title: "Status Unknown",
          desc: "",
          cssClass: "hero-pending",
        };
    }
  };

  const hero = getHeroConfig();

  return (
    <div className="status-page-container animate-fade-up">
      <div className={`status-hero ${hero.cssClass}`}>
        <div className="status-hero-icon">{hero.icon}</div>
        <h1>{hero.title}</h1>
        <p>{hero.desc}</p>
      </div>

      <div className="status-grid">
        <div className="status-column-left">
          <div className="status-section">
            <h2>Application Timeline</h2>

            {auditLogs.length === 0 ? (
              <p className="text-muted">
                No status updates yet. Your application was just created.
              </p>
            ) : (
              <div className="timeline">
                {/* Sort descending (newest first) */}
                {[...auditLogs]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((log) => {
                    const isDocumentAudit = log.previousStatus === log.newStatus;
                    const docApproved =
                      isDocumentAudit && log.note && log.note.includes("status set to Approved");
                    const docRejected =
                      isDocumentAudit && log.note && log.note.includes("status set to Rejected");

                    let dotClass = "dot-pending";
                    if (isDocumentAudit) {
                      dotClass = docApproved
                        ? "dot-verified"
                        : docRejected
                          ? "dot-rejected"
                          : "dot-review";
                    } else {
                      dotClass =
                        log.newStatus === "Rejected"
                          ? "dot-rejected"
                          : log.newStatus === "Verified"
                            ? "dot-verified"
                            : log.newStatus === "InReview"
                              ? "dot-review"
                              : "dot-pending";
                    }

                    const ts = new Date(log.timestamp).toLocaleString("en-LK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <div key={log.id} className="timeline-item">
                        <div className={`timeline-dot ${dotClass}`} />
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div>
                              {log.previousStatus !== log.newStatus ? (
                                <StatusBadge status={log.newStatus} size="sm" />
                              ) : (
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
                                  {docApproved ? "Approved" : docRejected ? "Rejected" : "Audited"}
                                </span>
                              )}
                            </div>
                            <span className="timeline-date">{ts}</span>
                          </div>
                          {(() => {
                            let adminNoteToDisplay: string | null = log.note;
                            if (log.note && log.note.includes("review status set to Approved")) {
                              const noteMatch = log.note.match(/[\s.]*Note:\s*(.+)$/is);
                              if (noteMatch && noteMatch[1]?.trim()) {
                                adminNoteToDisplay = noteMatch[1].trim();
                              } else {
                                adminNoteToDisplay = null;
                              }
                            }
                            return (
                              adminNoteToDisplay && (
                                <div className="timeline-note">
                                  <strong>Admin Note:</strong> {adminNoteToDisplay}
                                </div>
                              )
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div className="status-column-right">
          <div className="status-section">
            <h2>Submitted Documents</h2>
            {certifications.length === 0 ? (
              <p className="text-muted">No documents uploaded.</p>
            ) : (
              <div className="documents-list">
                {certifications.map((cert) => (
                  <DocumentCard key={cert.id} certification={cert} onResubmit={handleResubmit} />
                ))}
              </div>
            )}

            {(resubmitMutation.isPending || uploadError) && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {resubmitMutation.isPending && <p>Uploading document...</p>}
                {uploadError && <p className="text-danger">{uploadError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
