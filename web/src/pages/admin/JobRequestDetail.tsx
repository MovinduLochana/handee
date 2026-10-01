import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { jobRequestApi } from "../../api/jobRequests";
import { agentWorkflowApi } from "../../api/agentWorkflow";
import { BASE_URL } from "../../lib/api";
import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import LoadError from "../../components/booking/LoadError";
import { formatDateTime, formatMoney } from "../../components/booking/format";
import { getHttpStatus, retryUnlessClientError } from "../../components/booking/httpStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

function photoSrc(url: string): string {
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export default function JobRequestDetail() {
  const { id } = useParams<{ id: string }>();

  const {
    data: job,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["jobRequests", "detail", id],
    queryFn: () => jobRequestApi.getById(id!),
    enabled: !!id,
    retry: retryUnlessClientError,
  });

  const [expandedSteps, setExpandedSteps] = useState<Record<string | number, boolean>>({});
  const toggleStep = (key: string | number) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { data: workflow, isLoading: isWorkflowLoading } = useQuery({
    queryKey: ["agentWorkflow", "byJob", id],
    queryFn: () => agentWorkflowApi.getByJobId(id!),
    enabled: !!id,
    retry: false,
  });

  const backLink = (
    <Link to="/admin/job-requests" className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Job Requests
    </Link>
  );

  if (isLoading)
    return (
      <div className="p-16 text-center text-muted-foreground text-sm">Loading job request...</div>
    );

  if (isError && getHttpStatus(error) === 404)
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {backLink}
        <div className="text-muted-foreground text-sm">Job request not found.</div>
      </div>
    );

  if (isError || !job)
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {backLink}
        <LoadError title="Couldn't load this job request" error={error} onRetry={() => refetch()} />
      </div>
    );

  const budget =
    job.budgetMin === null && job.budgetMax === null
      ? "Not specified"
      : `${formatMoney(job.budgetMin)} – ${formatMoney(job.budgetMax)}`;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {backLink}

      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{job.categoryName}</h1>
          <BookingStatusBadge status={job.status} />
        </div>
        <p className="text-xs font-mono text-muted-foreground">Job request {job.id}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-semibold text-foreground">{job.categoryName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Category ID:</span>
              <span className="font-mono text-foreground">{job.serviceCategoryId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Location:</span>
              <span className="text-foreground">{job.location}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Urgency:</span>
              <Badge variant="outline" className="text-[11px] capitalize">
                {job.urgency}
              </Badge>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-semibold text-foreground">{budget}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Status:</span>
              <BookingStatusBadge status={job.status} size="sm" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Customer & Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Customer ID:</span>
              <span className="font-mono text-foreground">{job.customerId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Submitted:</span>
              <span className="text-foreground">{formatDateTime(job.createdAt)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Last updated:</span>
              <span className="text-foreground">{formatDateTime(job.updatedAt, "Never")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Photos ({job.photoUrls.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {job.photoUrls.length === 0 ? (
              <p className="text-xs text-muted-foreground">No photos attached.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {job.photoUrls.map((url, i) => (
                  <a
                    key={url}
                    href={photoSrc(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded border border-border hover:opacity-85 transition-opacity"
                  >
                    <img
                      src={photoSrc(url)}
                      alt={`Job photo ${i + 1}`}
                      loading="lazy"
                      className="w-24 h-24 object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── AI Agent Dispatch Workflow Section ── */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> AI Dispatch & Multi-Agent Analysis
            </CardTitle>
            <Link
              to="/admin/agent-workflow"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Governance Portal <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {isWorkflowLoading ? (
              <p className="text-xs text-muted-foreground">Loading agent dispatch workflow...</p>
            ) : !workflow ? (
              <div className="p-4 bg-muted/50 rounded border border-dashed border-border text-xs text-muted-foreground">
                No multi-agent dispatch workflow has been processed for this job request yet.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Objective:</span>
                    <span className="font-semibold text-foreground text-right">
                      {workflow.objective}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border items-center">
                    <span className="text-muted-foreground">Validation Tier:</span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        workflow.validationTier === "approved_for_auto_dispatch"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : workflow.validationTier === "approved_with_audit"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                      }`}
                    >
                      {workflow.validationTier}
                    </Badge>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border items-center">
                    <span className="text-muted-foreground">Approval Status:</span>
                    <span
                      className={`capitalize font-semibold ${
                        workflow.approvalStatus.toLowerCase() === "approved"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : workflow.approvalStatus.toLowerCase() === "pending"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-destructive"
                      }`}
                    >
                      {workflow.approvalStatus}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Matched Provider:</span>
                    <span className="text-right">
                      {workflow.selectedProviderName ? (
                        <span className="font-semibold text-foreground">
                          {workflow.selectedProviderName} (
                          {workflow.selectedProviderId
                            ? String(workflow.selectedProviderId).slice(0, 8)
                            : "N/A"}
                          )
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None assigned</span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">AI Estimated Price:</span>
                    <span className="font-bold text-primary font-mono">
                      {workflow.estimatedPrice
                        ? `LKR ${workflow.estimatedPrice.toLocaleString()}`
                        : "Not estimated"}
                    </span>
                  </div>

                  {workflow.decidedAt && (
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Decided At:</span>
                      <span className="text-foreground">{formatDateTime(workflow.decidedAt)}</span>
                    </div>
                  )}

                  {workflow.decisionNote && (
                    <div className="flex justify-between py-1 border-b border-border sm:col-span-2">
                      <span className="text-muted-foreground">Decision Note:</span>
                      <span className="text-foreground italic">"{workflow.decisionNote}"</span>
                    </div>
                  )}
                </div>

                {/* Step Logs */}
                {workflow.stepLogs && workflow.stepLogs.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Multi-Agent Execution Pipeline ({workflow.stepLogs.length} Steps)
                    </h3>
                    <div className="space-y-2">
                      {workflow.stepLogs.map((step) => {
                        const isExpanded = !!expandedSteps[step.stepNumber];
                        return (
                          <div
                            key={step.id || step.stepNumber}
                            className="border border-border rounded p-3 bg-muted/30 text-xs space-y-2"
                          >
                            <div
                              onClick={() => toggleStep(step.stepNumber)}
                              className="flex justify-between items-center cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                                  {step.stepNumber}
                                </span>
                                <span className="font-semibold text-foreground">
                                  {step.agentName}
                                </span>
                                <span className="text-muted-foreground">· {step.action}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground font-mono text-[11px]">
                                  {step.durationMs}ms
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="pt-2 border-t border-border font-mono text-[11px] space-y-2">
                                {step.inputData && (
                                  <div>
                                    <div className="font-bold text-muted-foreground mb-1">
                                      Input Payload:
                                    </div>
                                    <pre className="p-2 bg-background rounded border border-border overflow-x-auto whitespace-pre-wrap text-foreground">
                                      {step.inputData}
                                    </pre>
                                  </div>
                                )}
                                {step.outputData && (
                                  <div>
                                    <div className="font-bold text-muted-foreground mb-1">
                                      Output Result:
                                    </div>
                                    <pre className="p-2 bg-background rounded border border-border overflow-x-auto whitespace-pre-wrap text-foreground">
                                      {step.outputData}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
