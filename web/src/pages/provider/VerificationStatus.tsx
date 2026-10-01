import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, CheckCircle, AlertOctagon, ArrowRight } from "lucide-react";
import { providerApi } from "../../api/providers";
import { extractApiError } from "../../lib/api";
import StatusBadge from "../../components/provider/StatusBadge";
import DocumentCard from "../../components/provider/DocumentCard";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading status...</p>
        </div>
      </div>
    );
  }

  // If profile not found, errored, or fresh with no certs, show prompt to start verification
  if (
    isError ||
    !myProfile ||
    (myProfile.verificationStatus === "Pending" && (myProfile.certifications ?? []).length === 0)
  ) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card className="text-center p-8 border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-4">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertOctagon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Verification Not Started</h2>
              <p className="text-muted-foreground text-sm max-w-md mt-2">
                You haven't submitted your verification documents yet. Please complete the setup wizard to
                verify your identity and start accepting jobs.
              </p>
            </div>
            <Button
              onClick={() => navigate("/provider/submit-verification")}
              className="mt-2 inline-flex items-center gap-2"
            >
              Start Verification
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { verificationStatus, auditLogs = [], certifications = [] } = myProfile;

  // Determine hero UI based on status
  const getHeroConfig = () => {
    switch (verificationStatus) {
      case "Pending":
        return {
          icon: <Clock className="h-8 w-8" />,
          title: "Verification Pending",
          desc: "Your application has been received and is waiting for an administrator to begin the review process. Please check back later.",
          badgeVariant: "secondary" as const,
          containerClass: "bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-200",
          iconContainerClass: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
        };
      case "InReview":
        return {
          icon: <Clock className="h-8 w-8" />,
          title: "Application In Review",
          desc: "An administrator is currently reviewing your documents and profile details. We will notify you once a decision is made.",
          badgeVariant: "secondary" as const,
          containerClass: "bg-blue-500/10 border-blue-500/20 text-blue-950 dark:text-blue-200",
          iconContainerClass: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
        };
      case "Verified":
        return {
          icon: <CheckCircle className="h-8 w-8" />,
          title: "You are verified!",
          desc: "Congratulations! Your profile is verified and visible to customers in our marketplace. You can now accept jobs.",
          badgeVariant: "secondary" as const,
          containerClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-200",
          iconContainerClass: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
        };
      case "Rejected":
        return {
          icon: <AlertOctagon className="h-8 w-8" />,
          title: "Verification Rejected",
          desc: "Unfortunately, your application was rejected. Please review the notes below and resubmit updated documents.",
          badgeVariant: "destructive" as const,
          containerClass: "bg-destructive/10 border-destructive/20 text-destructive",
          iconContainerClass: "bg-destructive/20 text-destructive",
        };
      default:
        return {
          icon: <Clock className="h-8 w-8" />,
          title: "Status Unknown",
          desc: "",
          badgeVariant: "secondary" as const,
          containerClass: "bg-muted border-border text-foreground",
          iconContainerClass: "bg-muted-foreground/20 text-muted-foreground",
        };
    }
  };

  const hero = getHeroConfig();

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8 animate-fade-up">
      {/* Hero Banner */}
      <div className={`rounded-xl border p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5 ${hero.containerClass}`}>
        <div className={`p-3.5 rounded-xl shrink-0 ${hero.iconContainerClass}`}>
          {hero.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{hero.title}</h1>
            <StatusBadge status={verificationStatus} size="md" />
          </div>
          <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-3xl leading-relaxed">
            {hero.desc}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Timeline */}
        <div className="lg:col-span-7">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight">Application Timeline</CardTitle>
              <CardDescription>History of status reviews and updates for your provider account.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No status updates yet. Your application was just created.
                </p>
              ) : (
                <div className="relative pl-6 border-l-2 border-border space-y-6 my-2 ml-3">
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
                          ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                          : docRejected
                            ? "bg-destructive ring-4 ring-destructive/20"
                            : "bg-blue-500 ring-4 ring-blue-500/20";
                      } else {
                        dotBg =
                          log.newStatus === "Rejected"
                            ? "bg-destructive ring-4 ring-destructive/20"
                            : log.newStatus === "Verified"
                              ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                              : log.newStatus === "InReview"
                                ? "bg-blue-500 ring-4 ring-blue-500/20"
                                : "bg-amber-500 ring-4 ring-amber-500/20";
                      }

                      const ts = new Date(log.timestamp).toLocaleString("en-LK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      });

                      return (
                        <div key={log.id} className="relative group">
                          {/* Dot indicator */}
                          <div
                            className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ${dotBg}`}
                          />
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                {log.previousStatus !== log.newStatus ? (
                                  <StatusBadge status={log.newStatus} size="sm" />
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className={
                                      docApproved
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                        : docRejected
                                          ? "bg-destructive/10 text-destructive border-destructive/30"
                                          : "bg-muted text-foreground border-border"
                                    }
                                  >
                                    {docApproved ? "Approved" : docRejected ? "Rejected" : "Audited"}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{ts}</span>
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
                                  <div className="mt-2 rounded-md bg-muted/60 p-3 text-xs md:text-sm text-foreground border border-border/50">
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
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Submitted Documents */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight">Submitted Documents</CardTitle>
              <CardDescription>Verification documentation uploaded for your identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {certifications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded.</p>
              ) : (
                <div className="space-y-3">
                  {certifications.map((cert) => (
                    <DocumentCard key={cert.id} certification={cert} onResubmit={handleResubmit} />
                  ))}
                </div>
              )}

              {(resubmitMutation.isPending || uploadError) && (
                <div className="mt-4">
                  {resubmitMutation.isPending && (
                    <Alert className="bg-muted text-muted-foreground">
                      <AlertDescription>Uploading document...</AlertDescription>
                    </Alert>
                  )}
                  {uploadError && (
                    <Alert variant="destructive">
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
