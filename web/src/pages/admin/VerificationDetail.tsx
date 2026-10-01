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
import { getFullMediaUrl } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
    return (
      <div className="p-16 text-center text-muted-foreground text-sm">
        Loading provider detail...
      </div>
    );

  if (!profile)
    return (
      <div className="p-16 text-center text-muted-foreground text-sm space-y-4">
        <div>Provider not found.</div>
        <div>
          <Link
            to="/admin/verifications"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Back to Queue
          </Link>
        </div>
      </div>
    );

  const isPending = profile.verificationStatus === "Pending";
  const isInReview = profile.verificationStatus === "InReview";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Link to="/admin/verifications" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Queue
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <Avatar className="h-24 w-24 mx-auto border-2 border-border shadow-sm">
                {profile.profilePictureUrl && (
                  <AvatarImage
                    src={getFullMediaUrl(profile.profilePictureUrl)}
                    alt={profile.fullName}
                  />
                )}
                <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                  {profile.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-xl font-bold text-foreground">{profile.fullName}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile.headline || "No headline set"}
                </p>
              </div>

              <div className="flex justify-center">
                <StatusBadge status={profile.verificationStatus} size="lg" />
              </div>

              <div className="pt-4 border-t border-border space-y-3 text-left text-xs">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground block">Experience</span>
                    <span>{profile.yearsOfExperience} Years</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground block">Location</span>
                    <span>{profile.serviceAreaDisplayName || "Unknown"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground block">Member Since</span>
                    <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Verification Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-xs"
                disabled={!isPending || statusMutation.isPending}
                onClick={() => statusMutation.mutate({ newStatus: "InReview" })}
              >
                <Search className="h-4 w-4" />
                {statusMutation.isPending ? "Processing..." : "Start Review"}
              </Button>

              <Button
                className="w-full justify-start gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={(!isPending && !isInReview) || statusMutation.isPending}
                onClick={() => statusMutation.mutate({ newStatus: "Verified" })}
              >
                <CheckCircle className="h-4 w-4" /> Approve & Verify
              </Button>

              <Button
                variant="destructive"
                className="w-full justify-start gap-2 text-xs"
                disabled={(!isPending && !isInReview) || statusMutation.isPending}
                onClick={() => setIsRejectModalOpen(true)}
              >
                <XCircle className="h-4 w-4" /> Reject Application
              </Button>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Submitted Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.certifications.length === 0 ? (
                <p className="text-xs text-muted-foreground">No documents uploaded.</p>
              ) : (
                <div className="space-y-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No audit history available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status Change</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Admin ID</TableHead>
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
                            <TableCell className="whitespace-nowrap text-xs">
                              {new Date(log.timestamp).toLocaleString("en-LK", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-xs">
                                {log.previousStatus !== log.newStatus ? (
                                  <>
                                    <span className="text-muted-foreground">
                                      {log.previousStatus}
                                    </span>
                                    <span className="text-muted-foreground">→</span>
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
                                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                                          docApproved
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                            : docRejected
                                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                                              : "bg-muted text-foreground"
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
                            <TableCell className="max-w-xs text-xs truncate">
                              {log.note || "-"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {log.adminUserId.split("-")[0]}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsRejectModalOpen(false)}
        >
          <Card className="w-full max-w-md bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Reject Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Please provide a reason for the rejection. This note will be visible to the provider
                so they can correct the issue and resubmit.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Rejection Reason</label>
                <Textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="e.g. The uploaded NIC is blurry and unreadable. Please upload a clearer copy."
                  rows={4}
                  className="text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => statusMutation.mutate({ newStatus: "Rejected", note: rejectNote })}
                  disabled={!rejectNote.trim()}
                  className="text-xs"
                >
                  Confirm Rejection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
