import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, CheckCircle, AlertOctagon, Upload } from "lucide-react";
import { providerApi } from "../../api/providers";
import { extractApiError } from "../../lib/api";
import StatusBadge from "../../components/provider/StatusBadge";
import DocumentCard from "../../components/provider/DocumentCard";
import type { ProviderProfileAdminDto } from "../../api/types";
import "./VerificationStatus.css";

export default function VerificationStatusTracker() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // We use getMyProfile to get the ID, then fetch the full Admin projection to get AuditLogs
  const { data: myProfile, isLoading: isMeLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: providerApi.getMyProfile,
  });

  const { data: fullProfile, isLoading: isFullLoading } = useQuery({
    queryKey: ["providerProfile", myProfile?.id],
    queryFn: () => providerApi.getProfile(myProfile!.id!) as Promise<ProviderProfileAdminDto>,
    enabled: !!myProfile?.id,
  });

  // Handle Rejected Resubmission
  const resubmitMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!fullProfile) throw new Error("No profile state");
      await providerApi.uploadDocument(fullProfile.id, file, "NIC");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["providerProfile", myProfile?.id] });
      setUploadError(null);
    },
    onError: (err) => {
      setUploadError(extractApiError(err, "Failed to upload document."));
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      resubmitMutation.mutate(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isMeLoading || isFullLoading) {
    return <div className="state-container">Loading status...</div>;
  }

  if (!fullProfile) {
    return (
      <div className="state-container">
        <p className="text-muted">Loading profile data...</p>
      </div>
    );
  }

  const { verificationStatus, auditLogs = [], certifications = [] } = fullProfile;

  // Check if it's a fresh profile that hasn't started the wizard
  if (verificationStatus === "Pending" && certifications.length === 0) {
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
                    const dotClass =
                      log.newStatus === "Rejected"
                        ? "dot-rejected"
                        : log.newStatus === "Verified"
                          ? "dot-verified"
                          : log.newStatus === "InReview"
                            ? "dot-review"
                            : "dot-pending";

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
                              <StatusBadge status={log.newStatus} size="sm" />
                            </div>
                            <span className="timeline-date">{ts}</span>
                          </div>
                          {log.note && (
                            <div className="timeline-note">
                              <strong>Admin Note:</strong> {log.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {verificationStatus === "Rejected" && (
            <div className="resubmit-panel animate-fade-up">
              <h3>Resubmit Documents</h3>
              <p className="text-muted resubmit-desc">
                Please upload a clear photo or PDF of your National Identity Card (NIC) to re-open
                your application.
              </p>

              <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
              />

              <button
                className="wizard-btn wizard-btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={resubmitMutation.isPending}
              >
                <Upload size={16} />
                {resubmitMutation.isPending ? "Uploading..." : "Upload New Document"}
              </button>

              {uploadError && <div className="text-danger mt-2">{uploadError}</div>}
            </div>
          )}
        </div>

        <div className="status-column-right">
          <div className="status-section">
            <h2>Submitted Documents</h2>
            {certifications.length === 0 ? (
              <p className="text-muted">No documents uploaded.</p>
            ) : (
              <div className="documents-list">
                {certifications.map((cert) => (
                  <DocumentCard key={cert.id} certification={cert} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
