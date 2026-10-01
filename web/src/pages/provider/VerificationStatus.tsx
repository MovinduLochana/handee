import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, CheckCircle, AlertOctagon } from "lucide-react";
import { providerApi } from "../../api/providers";
import { extractApiError } from "../../lib/api";
import StatusBadge from "../../components/provider/StatusBadge";
import DocumentCard from "../../components/provider/DocumentCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    return <div className="p-8 text-center text-muted-foreground">Loading status...</div>;
  }

  // If profile not found, errored, or fresh with no certs, show prompt to start verification
  if (
    isError ||
    !myProfile ||
    (myProfile.verificationStatus === "Pending" && (myProfile.certifications ?? []).length === 0)
  ) {
    return (
      <Card className="max-w-xl mx-auto my-12 rounded-none border-border">
        <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
          <AlertOctagon className="w-12 h-12 text-muted-foreground/60" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Verification Not Started
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            You haven't submitted your verification documents yet. Please complete the setup wizard
            to verify your identity and start accepting jobs.
          </p>
          <Button onClick={() => navigate("/provider/submit-verification")} className="mt-2">
            Start Verification
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { verificationStatus, auditLogs = [], certifications = [] } = myProfile;

  // Determine hero UI based on status
  const getHeroConfig = () => {
    switch (verificationStatus) {
      case "Pending":
        return {
          icon: <Clock className="w-8 h-8 text-amber-500" />,
          title: "Verification Pending",
          desc: "Your application has been received and is waiting for an administrator to begin the review process. Please check back later.",
          borderClass: "border-l-4 border-l-amber-500",
        };
      case "InReview":
        return {
          icon: <CheckCircle className="w-8 h-8 text-blue-500" />,
          title: "Application In Review",
          desc: "An administrator is currently reviewing your documents and profile details. We will notify you once a decision is made.",
          borderClass: "border-l-4 border-l-blue-500",
        };
      case "Verified":
        return {
          icon: <CheckCircle className="w-8 h-8 text-emerald-500" />,
          title: "You are verified!",
          desc: "Congratulations! Your profile is verified and visible to customers in our marketplace. You can now accept jobs.",
          borderClass: "border-l-4 border-l-emerald-500",
        };
      case "Rejected":
        return {
          icon: <AlertOctagon className="w-8 h-8 text-destructive" />,
          title: "Verification Rejected",
          desc: "Unfortunately, your application was rejected. Please review the notes below and resubmit updated documents.",
          borderClass: "border-l-4 border-l-destructive",
        };
      default:
        return {
          icon: <Clock className="w-8 h-8 text-muted-foreground" />,
          title: "Status Unknown",
          desc: "",
          borderClass: "border-l-4 border-l-border",
        };
    }
  };

  const hero = getHeroConfig();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Card className={`rounded-none border-border ${hero.borderClass}`}>
        <CardContent className="p-6 flex items-start gap-4">
          <div className="shrink-0 pt-0.5">{hero.icon}</div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{hero.title}</h1>
            <p className="text-sm text-muted-foreground">{hero.desc}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Column */}
        <Card className="rounded-none border-border">
          <CardHeader>
            <CardTitle className="text-lg">Application Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No status updates yet. Your application was just created.
              </p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {/* Sort descending (newest first) */}
                {[...auditLogs]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((log) => {
                    const isDocumentAudit = log.previousStatus === log.newStatus;
                    const docApproved =
                      isDocumentAudit && log.note && log.note.includes("status set to Approved");
                    const docRejected =
                      isDocumentAudit && log.note && log.note.includes("status set to Rejected");

                    let dotBg = "bg-amber-500";
                    if (isDocumentAudit) {
                      dotBg = docApproved
                        ? "bg-emerald-500"
                        : docRejected
                          ? "bg-destructive"
                          : "bg-blue-500";
                    } else {
                      dotBg =
                        log.newStatus === "Rejected"
                          ? "bg-destructive"
                          : log.newStatus === "Verified"
                            ? "bg-emerald-500"
                            : log.newStatus === "InReview"
                              ? "bg-blue-500"
                              : "bg-amber-500";
                    }

                    const ts = new Date(log.timestamp).toLocaleString("en-LK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <div key={log.id} className="relative">
                        <div
                          className={`absolute -left-[1.85rem] top-1 w-3 h-3 rounded-full border-2 border-background ${dotBg}`}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              {log.previousStatus !== log.newStatus ? (
                                <StatusBadge status={log.newStatus} size="sm" />
                              ) : (
                                <Badge
                                  variant={
                                    docApproved
                                      ? "default"
                                      : docRejected
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="rounded-none text-xs"
                                >
                                  {docApproved ? "Approved" : docRejected ? "Rejected" : "Audited"}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{ts}</span>
                          </div>
                          {log.note && (
                            <p className="text-xs text-muted-foreground pt-1">
                              <span className="font-semibold text-foreground">Admin Note:</span>{" "}
                              {log.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents Column */}
        <Card className="rounded-none border-border">
          <CardHeader>
            <CardTitle className="text-lg">Submitted Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {certifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              <div className="space-y-3">
                {certifications.map((cert) => (
                  <DocumentCard key={cert.id} certification={cert} onResubmit={handleResubmit} />
                ))}
              </div>
            )}

            {(resubmitMutation.isPending || uploadError) && (
              <div className="p-3 border border-border bg-muted/40 rounded-none text-sm space-y-1">
                {resubmitMutation.isPending && (
                  <p className="text-muted-foreground">Uploading document...</p>
                )}
                {uploadError && <p className="text-destructive font-medium">{uploadError}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
