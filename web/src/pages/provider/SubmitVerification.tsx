import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { providerApi } from "../../api/providers";
import { extractApiError } from "../../lib/api";
import "./SubmitVerification.css";
import "../provider/ProviderOnboarding.css"; // Reuse base wizard styles like dropzones

export default function SubmitVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: providerApi.getMyProfile,
    retry: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [nicFile, setNicFile] = useState<File | null>(null);
  const [certFiles, setCertFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("No profile loaded");

      if (!nicFile) {
        // Wait, if they already have an NIC, they don't NEED to upload a new one,
        // but this standalone router is specifically for uploading missing docs.
        if (profile.certifications?.every((c) => c.type !== "NIC")) {
          throw new Error("NIC document is required for verification.");
        }
      } else {
        await providerApi.uploadDocument(profile.id, nicFile, "NIC");
      }

      for (const file of certFiles) {
        await providerApi.uploadDocument(profile.id, file, "TradeCertification");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      navigate("/provider/status");
    },
    onError: (err) => {
      setError(extractApiError(err, "Failed to submit documents."));
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (
        !nicFile &&
        (!profile?.certifications || profile.certifications.every((c) => c.type !== "NIC"))
      ) {
        setNicFile(files[0]);
        if (files.length > 1) setCertFiles((prev) => [...prev, ...files.slice(1)]);
      } else {
        setCertFiles((prev) => [...prev, ...files]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) return <div className="state-container">Loading...</div>;

  if (
    profile &&
    (profile.verificationStatus === "InReview" || profile.verificationStatus === "Verified")
  ) {
    navigate("/provider/status", { replace: true });
    return null;
  }

  return (
    <div className="verification-submit-container animate-fade-up">
      <header className="verification-submit-header">
        <ShieldCheck size={48} className="shield-icon" />
        <h1>Identity Verification</h1>
        <p>Upload your documents to confirm your identity and unlock your profile.</p>
      </header>

      <div className="verification-form-card">
        {profile?.verificationStatus === "Rejected" && (
          <div className="wizard-status-banner status-rejected mb-8">
            <AlertCircle size={20} />
            <span>
              Your previous application was rejected. Please review your information and upload
              clearer documents.
            </span>
          </div>
        )}

        {error && <div className="wizard-error mb-8">{error}</div>}

        <input
          type="file"
          hidden
          ref={fileInputRef}
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
        />

        <div className="wizard-field">
          <label className="field-label">National Identity Card (NIC) — Required</label>
          <p className="field-desc">
            Please provide a clear scan or photo of your government-issued ID.
          </p>
          {nicFile || profile?.certifications?.some((c) => c.type === "NIC") ? (
            <div className="upload-file-item file-uploaded">
              <div className="upload-file-name text-accent-bold">
                {nicFile ? nicFile.name : "NIC Document (Already Uploaded)"}
              </div>
              {nicFile && (
                <button className="upload-file-remove" onClick={() => setNicFile(null)}>
                  ✕
                </button>
              )}
            </div>
          ) : (
            <div
              className="upload-zone mb-6 cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="upload-zone-icon" size={32} />
              <div className="upload-zone-text">Click to upload your NIC</div>
              <div className="upload-zone-hint">Clear photo or PDF, max 5MB</div>
            </div>
          )}
        </div>

        <div className="wizard-field mt-10">
          <label className="field-label">Additional Trade Certifications (Optional)</label>
          <p className="field-desc">
            Upload any diplomas, certificates, or trade licenses to establish credibility.
          </p>
          <div
            className="upload-zone cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="upload-zone-icon" size={32} />
            <div className="upload-zone-text">Click to upload additional documents</div>
            <div className="upload-zone-hint">Photos or PDFs showcasing your trades</div>
          </div>

          {certFiles.length > 0 && (
            <div className="upload-file-list">
              {certFiles.map((file, i) => (
                <div key={i} className="upload-file-item">
                  <div className="upload-file-name truncate">{file.name}</div>
                  <div className="upload-file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  <button
                    className="upload-file-remove"
                    onClick={() => setCertFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            className="wizard-btn wizard-btn-secondary"
            onClick={() => navigate("/dashboard")}
            disabled={submitVerificationMutation.isPending}
          >
            Back
          </button>
          <button
            className="wizard-btn wizard-btn-primary"
            onClick={() => submitVerificationMutation.mutate()}
            disabled={
              submitVerificationMutation.isPending ||
              (!nicFile && !profile?.certifications?.some((c) => c.type === "NIC"))
            }
          >
            {submitVerificationMutation.isPending ? "Submitting..." : "Submit Documents"}{" "}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
