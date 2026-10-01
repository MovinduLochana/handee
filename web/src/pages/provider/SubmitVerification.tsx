import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, ArrowRight, ShieldCheck, AlertCircle, X, FileText } from "lucide-react";
import { providerApi } from "../../api/providers";
import { extractApiError } from "../../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

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

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  if (
    profile &&
    (profile.verificationStatus === "InReview" || profile.verificationStatus === "Verified")
  ) {
    navigate("/provider/status", { replace: true });
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <header className="text-center space-y-3">
        <div className="flex justify-center">
          <ShieldCheck className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Identity Verification</h1>
        <p className="text-muted-foreground text-sm">
          Upload your documents to confirm your identity and unlock your profile.
        </p>
      </header>

      <Card className="rounded-none border-border">
        <CardContent className="pt-6 space-y-6">
          {profile?.verificationStatus === "Rejected" && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Your previous application was rejected. Please review your information and upload
                clearer documents.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <input
            type="file"
            hidden
            ref={fileInputRef}
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />

          <div className="space-y-2">
            <Label className="text-sm font-semibold">National Identity Card (NIC) — Required</Label>
            <p className="text-xs text-muted-foreground">
              Please provide a clear scan or photo of your government-issued ID.
            </p>

            {nicFile || profile?.certifications?.some((c) => c.type === "NIC") ? (
              <div className="flex items-center justify-between p-3 border border-border bg-muted/40 text-sm">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium truncate">
                    {nicFile ? nicFile.name : "NIC Document (Already Uploaded)"}
                  </span>
                </div>
                {nicFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 cursor-pointer"
                    onClick={() => setNicFile(null)}
                    aria-label="Remove NIC"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border hover:border-primary p-6 text-center cursor-pointer transition-colors space-y-2"
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
                <Upload className="mx-auto w-8 h-8 text-muted-foreground" />
                <div className="text-sm font-medium text-foreground">Click to upload your NIC</div>
                <div className="text-xs text-muted-foreground">Clear photo or PDF, max 5MB</div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <Label className="text-sm font-semibold">
              Additional Trade Certifications (Optional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Upload any diplomas, certificates, or trade licenses to establish credibility.
            </p>

            <div
              className="border-2 border-dashed border-border hover:border-primary p-6 text-center cursor-pointer transition-colors space-y-2"
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
              <Upload className="mx-auto w-8 h-8 text-muted-foreground" />
              <div className="text-sm font-medium text-foreground">
                Click to upload additional documents
              </div>
              <div className="text-xs text-muted-foreground">
                Photos or PDFs showcasing your trades
              </div>
            </div>

            {certFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                {certFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border border-border bg-muted/30 text-sm"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 cursor-pointer"
                        onClick={() => setCertFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              disabled={submitVerificationMutation.isPending}
            >
              Back
            </Button>
            <Button
              onClick={() => submitVerificationMutation.mutate()}
              disabled={
                submitVerificationMutation.isPending ||
                (!nicFile && !profile?.certifications?.some((c) => c.type === "NIC"))
              }
              className="gap-2"
            >
              {submitVerificationMutation.isPending ? "Submitting..." : "Submit Documents"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
