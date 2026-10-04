import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  RefreshCw,
  Shield,
  UserCheck,
  ChevronRight,
  ChevronDown,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { agentWorkflowApi, type AgentWorkflowDto } from "../../api/agentWorkflow";
import UrgencyMultipliersConfig from "@/components/dashboard/UrgencyMultipliersConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AgentWorkflow() {
  const [workflows, setWorkflows] = useState<AgentWorkflowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Selected for Review Modal
  const [selectedWorkflow, setSelectedWorkflow] = useState<AgentWorkflowDto | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string | number, boolean>>({});

  const toggleStepExpand = (stepId: string | number) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  useEffect(() => {
    if (selectedWorkflow) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setSelectedWorkflow(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [selectedWorkflow]);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await agentWorkflowApi.getAll(selectedTier, selectedStatus);
      setWorkflows(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to load agent workflows");
    } finally {
      setLoading(false);
    }
  }, [selectedTier, selectedStatus]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleDecision = async (decision: "Approve" | "Reject" | "Revise") => {
    if (!selectedWorkflow) return;
    setSubmittingDecision(true);
    setActionSuccess(null);
    try {
      const updated = await agentWorkflowApi.makeDecision(
        selectedWorkflow.id,
        decision,
        decisionNote || undefined,
      );
      setActionSuccess(`Workflow successfully marked as ${decision}.`);
      setSelectedWorkflow(updated);
      setDecisionNote("");
      // Refresh background list
      await fetchWorkflows();
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || "Failed to record decision");
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Metric counts
  const totalCount = workflows.length;
  const pendingCount = workflows.filter((w) => w.approvalStatus.toLowerCase() === "pending").length;
  const auditCount = workflows.filter(
    (w) => w.validationTier.toLowerCase() === "approved_with_audit",
  ).length;
  const autoDispatchCount = workflows.filter(
    (w) => w.validationTier.toLowerCase() === "approved_for_auto_dispatch",
  ).length;

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "revised":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getTierBadge = (tier: string) => {
    const t = tier.toLowerCase();
    if (t === "approved_for_auto_dispatch") {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 font-medium"
        >
          <CheckCircle className="h-3 w-3" /> Auto-Dispatch
        </Badge>
      );
    }
    if (t === "approved_with_audit") {
      return (
        <Badge
          variant="outline"
          className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 gap-1 font-medium"
        >
          <AlertCircle className="h-3 w-3" /> Audit Required
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-destructive/30 bg-destructive/10 text-destructive gap-1 font-medium"
      >
        <Shield className="h-3 w-3" /> Human Approval
      </Badge>
    );
  };

  // Helper to parse finalResultJson
  const parseFinalResult = (jsonStr?: string | null) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Agent Monitoring & HITL Governance
          </h1>
          <p className="text-muted-foreground max-w-3xl mt-1 text-sm leading-relaxed">
            Supervise the four-agent dispatch pipeline. Matches flagged as high risk require manual
            administrator review before job dispatch under the Human-in-the-Loop policy.
          </p>
        </div>
        <Button variant="outline" onClick={fetchWorkflows} className="gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Runs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-foreground">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Requires Human Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div
              className={`text-3xl font-bold ${pendingCount > 0 ? "text-destructive" : "text-foreground"}`}
            >
              {pendingCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Approved With Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{auditCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Auto-Dispatched
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {autoDispatchCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Pricing Engine: Urgency Multipliers Configuration */}
      <UrgencyMultipliersConfig />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1 font-medium">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filter Tier:
          </div>
          {[
            { key: "all", label: "All Tiers" },
            { key: "requires_human_approval", label: "Requires Approval" },
            { key: "approved_with_audit", label: "Audit Required" },
            { key: "approved_for_auto_dispatch", label: "Auto-Dispatch" },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={selectedTier === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTier(tab.key)}
              className="text-xs"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {[
            { key: "all", label: "All Status" },
            { key: "pending", label: "Pending" },
            { key: "approved", label: "Approved" },
          ].map((st) => (
            <Button
              key={st.key}
              variant={selectedStatus === st.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus(st.key)}
              className="text-xs"
            >
              {st.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Workflows Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />
            Loading agent workflows...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-destructive">
            <AlertCircle className="h-6 w-6 mx-auto mb-3" />
            {error}
          </div>
        ) : workflows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No agent workflows match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job / Workflow</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Candidate Provider</TableHead>
                  <TableHead>Quote</TableHead>
                  <TableHead>Risk Tier</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((wf) => (
                  <TableRow key={wf.id}>
                    <TableCell className="font-medium">
                      <div className="font-mono text-xs">{wf.workflowId || wf.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(wf.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm font-medium">{wf.objective}</div>
                    </TableCell>
                    <TableCell>
                      {wf.selectedProviderName ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                          {wf.selectedProviderName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">None Assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-sm">
                      {wf.estimatedPrice ? `Rs. ${wf.estimatedPrice.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>{getTierBadge(wf.validationTier)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(wf.approvalStatus)}
                        <span className="text-xs capitalize">{wf.approvalStatus}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={
                          wf.approvalStatus.toLowerCase() === "pending" ? "default" : "outline"
                        }
                        onClick={() => {
                          setSelectedWorkflow(wf);
                          setActionSuccess(null);
                          setDecisionNote("");
                        }}
                        className="gap-1 text-xs"
                      >
                        {wf.approvalStatus.toLowerCase() === "pending" ? "Review" : "Audit"}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Review & Audit Modal Drawer */}
      {selectedWorkflow && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200"
          onClick={() => setSelectedWorkflow(null)}
        >
          <div
            className="w-full max-w-xl bg-card border-l border-border h-dvh max-h-screen shadow-2xl flex flex-col overflow-hidden text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 p-5 border-b border-border bg-card flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono px-2 py-0.5 bg-muted border border-border rounded font-semibold text-foreground">
                    {selectedWorkflow.workflowId || selectedWorkflow.id.slice(0, 8)}
                  </span>
                  {getTierBadge(selectedWorkflow.validationTier)}
                </div>
                <h2 className="text-lg font-bold text-foreground">Workflow Audit & Governance</h2>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Initiated: {new Date(selectedWorkflow.createdAt).toLocaleString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedWorkflow(null)}
                aria-label="Close audit drawer"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
              {/* Success alert */}
              {actionSuccess && (
                <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertDescription className="font-medium text-xs">
                    {actionSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {/* Job Summary & Provider Overview Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-3">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Customer Job Request
                  </div>
                  <div className="font-medium text-sm text-foreground">
                    {selectedWorkflow.objective}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border text-xs">
                    <div>
                      <span className="text-muted-foreground">Candidate Provider:</span>
                      <div className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                        {selectedWorkflow.selectedProviderName ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            {selectedWorkflow.selectedProviderName}
                          </>
                        ) : (
                          <span className="text-muted-foreground">None Assigned</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estimated Quote:</span>
                      <div className="font-bold text-foreground mt-0.5 font-mono text-sm">
                        {selectedWorkflow.estimatedPrice
                          ? `Rs. ${selectedWorkflow.estimatedPrice.toLocaleString()}`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Approval Status:</span>
                      <div className="font-medium text-foreground mt-0.5 flex items-center gap-1.5 capitalize">
                        {getStatusIcon(selectedWorkflow.approvalStatus)}
                        {selectedWorkflow.approvalStatus}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Job Request ID:</span>
                      <div className="font-mono text-foreground mt-0.5 text-xs truncate">
                        {selectedWorkflow.jobRequestId || "N/A"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Rules & Audit Checklist */}
              {(() => {
                const res = parseFinalResult(selectedWorkflow.finalResultJson);
                const rules = res?.evaluated_rules || [];
                const reasons = res?.reasons || [];
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Validation Rules & Audit Checklist
                      </h3>
                      {rules.length > 0 && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {rules.filter((r: any) => r.passed).length}/{rules.length} Passed
                        </span>
                      )}
                    </div>

                    {reasons.length > 0 && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-xs space-y-1.5">
                        <div className="font-semibold text-destructive">
                          Flagged Safety Concerns:
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-foreground">
                          {reasons.map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rules.length > 0 ? (
                      <div className="space-y-2">
                        {rules.map((rule: any, idx: number) => (
                          <div
                            key={idx}
                            className={`flex items-start justify-between gap-3 p-3 rounded border text-xs ${
                              rule.passed
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-destructive/5 border-destructive/20"
                            }`}
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  {rule.rule_name}
                                </span>
                                {rule.rule_id && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                                    {rule.rule_id}
                                  </span>
                                )}
                              </div>
                              <div className="text-muted-foreground leading-relaxed">
                                {rule.message}
                              </div>
                            </div>
                            <div className="shrink-0 mt-0.5">
                              {rule.passed ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground py-2">
                        No granular rule checks recorded in workflow payload.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Agent Execution Steps */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Agent Execution Steps
                </h3>
                <div className="space-y-2">
                  {selectedWorkflow.stepLogs && selectedWorkflow.stepLogs.length > 0 ? (
                    selectedWorkflow.stepLogs.map((step) => {
                      const stepKey = step.id || step.stepNumber;
                      const isExpanded = !!expandedSteps[stepKey];
                      return (
                        <div
                          key={stepKey}
                          className="p-3 rounded border border-border bg-card text-xs space-y-1.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">
                              Step {step.stepNumber}: {step.agentName}
                            </span>
                            <span className="text-muted-foreground font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">
                              {step.durationMs}ms
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            Action:{" "}
                            <code className="font-mono text-primary font-medium">
                              {step.action}
                            </code>
                          </div>
                          {step.outputData && (
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleStepExpand(stepKey)}
                                className="text-muted-foreground hover:text-foreground text-[11px] inline-flex items-center gap-1 underline underline-offset-2 mt-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronDown className="h-3 w-3" /> Hide Payload
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight className="h-3 w-3" /> View Output Payload
                                  </>
                                )}
                              </button>
                              {isExpanded && (
                                <div className="mt-2 p-2 bg-muted rounded font-mono text-[11px] max-h-36 overflow-y-auto break-all whitespace-pre-wrap border border-border">
                                  {step.outputData}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No detailed step logs recorded for this workflow run.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="shrink-0 border-t border-border p-5 bg-card">
              {selectedWorkflow.approvalStatus.toLowerCase() === "pending" ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Record HITL Decision
                    </h4>
                    <span className="text-[11px] text-muted-foreground">Action required</span>
                  </div>
                  <Textarea
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Optional review note or feedback..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      disabled={submittingDecision}
                      onClick={() => handleDecision("Approve")}
                      className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve Match
                    </Button>
                    <Button
                      type="button"
                      disabled={submittingDecision}
                      onClick={() => handleDecision("Revise")}
                      className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      size="sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Request Revision
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={submittingDecision}
                      onClick={() => handleDecision("Reject")}
                      className="gap-1.5 text-xs"
                      size="sm"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject Match
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <div className="text-muted-foreground">
                      Decision recorded on:{" "}
                      {selectedWorkflow.decidedAt
                        ? new Date(selectedWorkflow.decidedAt).toLocaleString()
                        : "System Auto-Dispatch"}
                    </div>
                    {selectedWorkflow.decisionNote && (
                      <div className="text-foreground mt-0.5 italic">
                        "{selectedWorkflow.decisionNote}"
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWorkflow(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
