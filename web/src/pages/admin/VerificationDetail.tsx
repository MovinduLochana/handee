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
import { extractApiError, getFullMediaUrl } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Link
        to="/admin/verifications"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Queue
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Sidebar: Profile Summary & Actions ── */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          <Card className="text-center">
            <CardContent className="p-6 space-y-4">
              {profile.profilePictureUrl ? (
                <img
                  src={getFullMediaUrl(profile.profilePictureUrl)}
                  alt={profile.fullName}
                  className="w-24 h-24 rounded-full object-cover mx-auto ring-2 ring-border shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-3xl font-bold mx-auto ring-2 ring-border shadow-sm">
                  {profile.fullName.charAt(0)}
                </div>
              )}

              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  {profile.fullName}
                </h1>
                <p className="text-xs text-muted-foreground">{profile.headline || "No headline set"}</p>
              </div>

              <div className="pt-1 flex justify-center">
                <StatusBadge status={profile.verificationStatus} size="lg" />
              </div>

              <div className="border-t border-border pt-4 text-left space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                      Experience
                    </h5>
                    <p className="font-medium text-foreground">{profile.yearsOfExperience} Years</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                      Location
                    </h5>
                    <p className="font-medium text-foreground">
                      {profile.serviceAreaDisplayName || "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                      Member Since
                    </h5>
                    <p className="font-medium text-foreground">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold text-foreground">
                Verification Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button
                variant="outline"
                className="w-full justify-center gap-2 font-semibold"
                disabled={!isPending || statusMutation.isPending}
                onClick={() => statusMutation.mutate({ newStatus: "InReview" })}
              >
                <Search className="h-4 w-4" />
                {statusMutation.isPending ? "Processing..." : "Start Review"}
              </Button>

              <Button
                className="w-full justify-center gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                disabled={(!isPending && !isInReview) || statusMutation.isPending}
                onClick={() => statusMutation.mutate({ newStatus: "Verified" })}
              >
                <CheckCircle className="h-4 w-4" />
                {statusMutation.isPending ? "Processing..." : "Approve & Verify"}
              </Button>

              <Button
                variant="destructive"
                className="w-full justify-center gap-2 font-semibold"
                disabled={(!isPending && !isInReview) || statusMutation.isPending}
                onClick={() => setIsRejectModalOpen(true)}
              >
                <XCircle className="h-4 w-4" /> Reject Application
              </Button>
            </CardContent>
          </Card>
        </aside>

        {/* ── Main Content: Documents & Audit Trail ── */}
        <main className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="border-b border-border pb-3 flex flex-row items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-bold text-foreground">
                Submitted Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {profile.certifications.length === 0 ? (
                <p className="text-xs text-muted-foreground">No documents uploaded.</p>
              ) : (
                <div className="space-y-3">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-3 flex flex-row items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-bold text-foreground">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {profile.auditLogs.length === 0 ? (
                <p className="p-6 text-xs text-muted-foreground">No audit history available.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase whitespace-nowrap">Date</TableHead>
                      <TableHead className="text-xs uppercase whitespace-nowrap">Status Change</TableHead>
                      <TableHead className="text-xs uppercase">Note</TableHead>
                      <TableHead className="text-xs uppercase whitespace-nowrap">Admin</TableHead>
                      <TableHead className="text-xs uppercase text-right whitespace-nowrap">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...profile.auditLogs]
                      .sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                      )
                      .map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString("en-LK", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {log.previousStatus !== log.newStatus ? (
                                <>
                                  <span className="text-xs text-muted-foreground">
                                    {log.previousStatus}
                                  </span>
                                  <span className="text-xs text-muted-foreground">→</span>
                                  <StatusBadge status={log.newStatus} size="sm" />
                                </>
                              ) : (
                                (() => {
                                  const docApproved = log.note?.includes("status set to Approved");
                                  const docRejected = log.note?.includes("status set to Rejected");
                                  return (
                                    <span
                                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                        docApproved
                                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                                          : docRejected
                                            ? "bg-destructive/10 text-destructive border-destructive/20"
                                            : "bg-muted text-muted-foreground border-border"
                                      }`}
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
                          </TableCell>
                          <TableCell
                            className="audit-note-cell max-w-[160px] truncate text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                            style={{ whiteSpace: "nowrap" }}
                            title={log.note || ""}
                            onClick={() => setViewingAuditLog(log)}
                          >
                            {log.note || "-"}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {log.adminUserId.split("-")[0]}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="h-7 text-xs gap-1"
                              onClick={() => setViewingAuditLog(log)}
                              title="View audit details"
                            >
                              <Eye className="h-3 w-3" /> Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Audit Log Detail Modal */}
      {viewingAuditLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewingAuditLog(null)}
        >
          <div
            className="bg-card text-card-foreground border border-border shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Audit Log Entry
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => setViewingAuditLog(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-none bg-muted/30 border border-border text-xs">
              <div>
                <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Timestamp
                </span>
                <p className="mt-1 font-medium text-foreground">
                  {new Date(viewingAuditLog.timestamp).toLocaleString("en-LK", {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}
                </p>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Status Transition
                </span>
                <div className="mt-1 flex items-center gap-2">
                  {viewingAuditLog.previousStatus !== viewingAuditLog.newStatus ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{viewingAuditLog.previousStatus}</span>
                      <span className="text-muted-foreground">→</span>
                      <StatusBadge status={viewingAuditLog.newStatus} size="sm" />
                    </div>
                  ) : (
                    (() => {
                      const docApproved = viewingAuditLog.note?.includes("status set to Approved");
                      const docRejected = viewingAuditLog.note?.includes("status set to Rejected");
                      return (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            docApproved
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                              : docRejected
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {docApproved ? "Approved" : docRejected ? "Rejected" : "Document Audit"}
                        </span>
                      );
                    })()
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Admin User ID
                </span>
                <p className="mt-1 font-mono text-xs text-foreground break-all">
                  {viewingAuditLog.adminUserId}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Audit Note</Label>
              <div className="p-3 bg-muted/40 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words max-h-56 overflow-y-auto">
                {viewingAuditLog.note || (
                  <span className="text-muted-foreground italic">No note provided.</span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-24"
                onClick={() => setViewingAuditLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card text-card-foreground border border-border shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Reject Application
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please provide a reason for the rejection. This note will be visible to the provider
              so they can correct the issue and resubmit.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rejection Reason</Label>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. The uploaded NIC is blurry and unreadable. Please upload a clearer copy."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRejectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => statusMutation.mutate({ newStatus: "Rejected", note: rejectNote })}
                disabled={!rejectNote.trim() || statusMutation.isPending}
              >
                {statusMutation.isPending ? "Processing..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Approval Modal with Note */}
      {approvingCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card text-card-foreground border border-border shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Approve Submitted Document
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Approving <strong>{approvingCert.originalFileName || approvingCert.type}</strong> (
              {approvingCert.type}). You can optionally attach an approval note to this record.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Approval Note (Optional)</Label>
              <Input
                type="text"
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="e.g. Verified with national registry, document is valid and legible."
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setApprovingCert(null);
                  setApproveNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                <CheckCircle className="h-4 w-4 mr-1.5" />
                {documentReviewMutation.isPending ? "Approving..." : "Confirm Approval"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Rejection Modal with Note */}
      {rejectingCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card text-card-foreground border border-border shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Reject Submitted Document
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rejecting <strong>{rejectingCert.originalFileName || rejectingCert.type}</strong> (
              {rejectingCert.type}). Please provide a reason for rejecting this document.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rejection Reason (Optional)</Label>
              <Textarea
                value={rejectDocNote}
                onChange={(e) => setRejectDocNote(e.target.value)}
                placeholder="e.g. Document is expired, unreadable, or missing required details."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejectingCert(null);
                  setRejectDocNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
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
                <XCircle className="h-4 w-4 mr-1.5" />
                {documentReviewMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
