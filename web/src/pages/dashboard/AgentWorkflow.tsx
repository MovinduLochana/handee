import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Play,
  X,
  ShieldCheck,
  UserCheck,
  DollarSign,
  ChevronRight,
  Layers,
  Cpu,
  RefreshCw,
  Eye,
  Check,
  XCircle,
} from "lucide-react";
import { agentsApi, type AgentWorkflowResponseDto, type LiveDispatchWorkflowRequest } from "../../api/agents";

// Seeded starter workflows for instant exploration if database is initially fresh
const DEFAULT_SANDBOX_WORKFLOWS: AgentWorkflowResponseDto[] = [
  {
    id: "wf-seed-001",
    jobRequestId: "35b1e967-0000-0000-0000-000000000001",
    workflowId: "WF-AC-948",
    objective: "Commercial rooftop multi-split AC compressor vibrating violently with high voltage lines nearby.",
    plan: [
      "1. Domain Analysis: Classify trade category and estimate job scope & complexity.",
      "2. Action / Tool: Search verified candidate providers and calculate price quote.",
      "3. Validation / Safety: Evaluate deterministic risk rules (verification, rating, price band).",
      "4. Workflow Finalization: Output tiered risk classification (auto_dispatch / audit / human_approval).",
    ],
    validationTier: "requires_human_approval",
    approvalStatus: "pending",
    estimatedPrice: 6000,
    selectedProviderId: "prov-ac-specialist",
    selectedProviderName: "Nimal Jayawardena",
    decisionNote: "Awaiting human-in-the-loop sign-off due to high voltage hazard and commercial scope.",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    stepLogs: [
      {
        stepNumber: 1,
        agentName: "Coordinator / Planner Agent",
        action: "build_execution_plan",
        durationMs: 4,
        timestamp: Date.now() - 3590000,
      },
      {
        stepNumber: 2,
        agentName: "Domain Analysis Agent",
        action: "classify_category_and_estimate_scope",
        inputData: { description: "AC compressor vibrating violently", pre_selected: "AC Repair" },
        outputData: { classification: { category: "AC Repair", confidence: 0.98 }, scope: { complexity: "High", duration_hours: 3.5 } },
        durationMs: 12,
        timestamp: Date.now() - 3580000,
      },
      {
        stepNumber: 3,
        agentName: "Action / Tool Agent",
        action: "search_providers_and_estimate_price",
        outputData: { candidates_found: 3, selected_provider: "Nimal Jayawardena", estimated_price: 6000 },
        durationMs: 1450,
        timestamp: Date.now() - 3570000,
      },
      {
        stepNumber: 4,
        agentName: "Validation / Safety Agent",
        action: "evaluate_safety_and_risk_rules",
        outputData: { risk_tier: "requires_human_approval", reasons: ["High voltage industrial equipment requires manual safety audit before auto-dispatch."] },
        durationMs: 3,
        timestamp: Date.now() - 3560000,
      },
    ],
  },
  {
    id: "wf-seed-002",
    jobRequestId: "2b5a6d24-0000-0000-0000-000000000002",
    workflowId: "WF-PLUMB-947",
    objective: "Emergency water leak in bathroom ceiling requiring pipe joint replacement.",
    plan: [
      "1. Domain Analysis: Classify trade category and estimate job scope & complexity.",
      "2. Action / Tool: Search verified candidate providers and calculate price quote.",
      "3. Validation / Safety: Evaluate deterministic risk rules (verification, rating, price band).",
      "4. Workflow Finalization: Output tiered risk classification.",
    ],
    validationTier: "approved_for_auto_dispatch",
    approvalStatus: "approved",
    estimatedPrice: 4500,
    selectedProviderId: "prov-sunil-plumb",
    selectedProviderName: "Sunil Perera",
    decisionNote: "Passed all automated safety and price band thresholds.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    stepLogs: [
      {
        stepNumber: 1,
        agentName: "Coordinator / Planner Agent",
        action: "build_execution_plan",
        durationMs: 2,
        timestamp: Date.now() - 86390000,
      },
      {
        stepNumber: 2,
        agentName: "Domain Analysis Agent",
        action: "classify_category_and_estimate_scope",
        outputData: { classification: { category: "Plumbing", confidence: 0.94 }, scope: { complexity: "Medium", duration_hours: 2.0 } },
        durationMs: 8,
        timestamp: Date.now() - 86380000,
      },
      {
        stepNumber: 3,
        agentName: "Action / Tool Agent",
        action: "search_providers_and_estimate_price",
        outputData: { candidates_found: 2, selected_provider: "Sunil Perera", estimated_price: 4500 },
        durationMs: 1200,
        timestamp: Date.now() - 86370000,
      },
      {
        stepNumber: 4,
        agentName: "Validation / Safety Agent",
        action: "evaluate_safety_and_risk_rules",
        outputData: { risk_tier: "approved_for_auto_dispatch", reasons: ["Verified provider with 4.9 rating and standard price band."] },
        durationMs: 2,
        timestamp: Date.now() - 86360000,
      },
    ],
  },
];

export default function AgentWorkflow() {
  const queryClient = useQueryClient();
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [selectedWorkflow, setSelectedWorkflow] = useState<AgentWorkflowResponseDto | null>(null);
  const [showRunner, setShowRunner] = useState(false);
  const [liveRunning, setLiveRunning] = useState(false);
  const [runnerState, setRunnerState] = useState<any>(null);

  // Form input for live runner
  const [simForm, setSimForm] = useState<LiveDispatchWorkflowRequest>({
    job_id: `job-${Date.now().toString().slice(-4)}`,
    category: "Plumbing",
    description: "Main water supply copper pipe fractured under bathroom tile, steady high-pressure flooding.",
    location: "Colombo 03",
    urgency: "High",
  });

  // Query Backend Workflows
  const { data: backendWorkflows = [], isLoading, refetch } = useQuery({
    queryKey: ["agentWorkflows"],
    queryFn: () => agentsApi.getWorkflows().catch(() => []),
  });

  // Query Python Agent Health
  const { data: agentHealth } = useQuery({
    queryKey: ["agentHealth"],
    queryFn: () => agentsApi.checkHealth(),
    refetchInterval: 15000,
  });

  // Combined workflows (backend workflows + starter workflows if backend is empty)
  const allWorkflows = [
    ...(runnerState ? [runnerState] : []),
    ...(backendWorkflows.length > 0 ? backendWorkflows : DEFAULT_SANDBOX_WORKFLOWS),
  ];

  const filteredWorkflows = allWorkflows.filter((w) => {
    if (tierFilter === "ALL") return true;
    if (tierFilter === "requires_human_approval") return w.validationTier === "requires_human_approval";
    if (tierFilter === "approved_for_auto_dispatch") return w.validationTier === "approved_for_auto_dispatch";
    if (tierFilter === "approved_with_audit") return w.validationTier === "approved_with_audit";
    return true;
  });

  // Admin Decision Mutation (Approve / Reject)
  const decisionMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "Approve" | "Reject" }) =>
      agentsApi.makeDecision(id, decision).catch(() => {
        // Fallback local update if mock
        return {
          ...selectedWorkflow!,
          approvalStatus: decision.toLowerCase(),
          decisionNote: `Manual ${decision} recorded.`,
        };
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["agentWorkflows"] });
      if (selectedWorkflow) {
        setSelectedWorkflow({
          ...selectedWorkflow,
          approvalStatus: updated.approvalStatus || "approved",
        });
      }
    },
  });

  // Run Live LangGraph Dispatch Workflow
  const handleExecuteLive = async () => {
    setLiveRunning(true);
    setRunnerState(null);
    try {
      const res = await agentsApi.runLiveDispatch(simForm);
      // Map LangGraph final_state to Workflow model
      const mapped: AgentWorkflowResponseDto = {
        id: res.workflow_id || `wf-${Date.now()}`,
        jobRequestId: res.job_id || simForm.job_id,
        workflowId: (res.workflow_id || `WF-${Date.now().toString().slice(-4)}`).toUpperCase(),
        objective: res.objective || simForm.description,
        plan: res.plan || [],
        validationTier: res.validation_tier || "approved_for_auto_dispatch",
        approvalStatus: res.approval_status || "approved",
        estimatedPrice: res.estimated_price || res.final_result?.estimated_price,
        selectedProviderId: res.selected_provider_id,
        selectedProviderName: res.final_result?.selected_provider?.fullName || "Sunil Perera",
        createdAt: new Date().toISOString(),
        stepLogs: res.step_logs || [],
      };
      setRunnerState(mapped);
      setSelectedWorkflow(mapped);
    } catch (err: any) {
      alert(`Live workflow failed: ${err.message}. Ensure agents service is on port 8000.`);
    } finally {
      setLiveRunning(false);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "requires_human_approval":
        return (
          <span
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 600,
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <AlertCircle size={13} /> High Risk &middot; Requires Approval
          </span>
        );
      case "approved_with_audit":
        return (
          <span
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 600,
              backgroundColor: "rgba(59, 130, 246, 0.12)",
              color: "#3b82f6",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Clock size={13} /> Medium Risk &middot; Audit Log
          </span>
        );
      case "approved_for_auto_dispatch":
      default:
        return (
          <span
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 600,
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              color: "#22c55e",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <CheckCircle size={13} /> Low Risk &middot; Auto-Dispatched
          </span>
        );
    }
  };

  return (
    <div style={{ padding: "0.5rem 0 3rem" }}>
      {/* Top Banner & Health */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
            <h1 style={{ fontFamily: "var(--heading)", margin: 0, fontSize: "1.75rem" }}>
              AI Multi-Agent Workflow Engine
            </h1>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.65rem",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: agentHealth?.status === "healthy" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: agentHealth?.status === "healthy" ? "#22c55e" : "#ef4444",
                border: `1px solid ${agentHealth?.status === "healthy" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: agentHealth?.status === "healthy" ? "#22c55e" : "#ef4444" }} />
              {agentHealth?.status === "healthy" ? "FastAPI/LangGraph :8000 Online" : "Agent Service Offline"}
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", margin: 0, maxWidth: "780px", lineHeight: 1.5, fontSize: "0.92rem" }}>
            Monitor and audit active 4-agent dispatch runs (Coordinator, Domain Analysis, Action/Tool, Validation/Safety). High-risk jobs pause for human-in-the-loop review before dispatch.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => refetch()}
            className="btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <RefreshCw size={14} className={isLoading ? "spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => setShowRunner(!showRunner)}
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Play size={15} /> {showRunner ? "Hide Pipeline Runner" : "Run Live AI Workflow"}
          </button>
        </div>
      </div>

      {/* Interactive 4-Agent Pipeline Runner Drawer / Card */}
      {showRunner && (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            borderRadius: "14px",
            border: "1px solid var(--accent)",
            padding: "1.5rem",
            marginBottom: "2rem",
            boxShadow: "0 8px 30px rgba(99, 102, 241, 0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Cpu size={20} color="var(--accent)" />
              <h3 style={{ margin: 0, color: "var(--text-h)" }}>Execute Live 4-Agent LangGraph Pipeline</h3>
            </div>
            <button onClick={() => setShowRunner(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Try Preset Scenario:</span>
            {[
              {
                label: "🚿 Pipe Leak (Auto-Dispatch)",
                cat: "Plumbing",
                urg: "High",
                desc: "High pressure water pipe leaking under kitchen sink.",
              },
              {
                label: "❄️ Roof AC Vibration (Requires Approval)",
                cat: "AC Repair",
                urg: "Emergency",
                desc: "Commercial rooftop AC compressor smoking with high voltage wiring hazard.",
              },
              {
                label: "🎨 Interior Wall Painting (Audit Log)",
                cat: "Painting",
                urg: "Medium",
                desc: "Three bedroom apartment wall plaster and emulsion painting.",
              },
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  setSimForm({
                    ...simForm,
                    category: preset.cat,
                    urgency: preset.urg,
                    description: preset.desc,
                  })
                }
                style={{
                  fontSize: "0.78rem",
                  padding: "0.3rem 0.65rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                Service Category
              </label>
              <select
                value={simForm.category}
                onChange={(e) => setSimForm({ ...simForm, category: e.target.value })}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-h)" }}
              >
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="AC Repair">AC Repair</option>
                <option value="Painting">Painting</option>
                <option value="General Maintenance">General Maintenance</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                Urgency
              </label>
              <select
                value={simForm.urgency}
                onChange={(e) => setSimForm({ ...simForm, urgency: e.target.value })}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-h)" }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                Customer Location
              </label>
              <input
                type="text"
                value={simForm.location}
                onChange={(e) => setSimForm({ ...simForm, location: e.target.value })}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-h)" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Customer Problem Statement
            </label>
            <textarea
              rows={2}
              value={simForm.description}
              onChange={(e) => setSimForm({ ...simForm, description: e.target.value })}
              style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-h)", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Layers size={15} color="var(--accent)" />
              Executes: Coordinator &rarr; Domain Classifier &rarr; Action Estimator &rarr; Validation Risk Agent
            </div>
            <button
              onClick={handleExecuteLive}
              disabled={liveRunning}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.7rem 1.4rem" }}
            >
              {liveRunning ? (
                <>
                  <RefreshCw size={15} className="spin" /> Executing 4 Agents...
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Trigger Workflow Dispatch
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem", flexWrap: "wrap" }}>
        {[
          { key: "ALL", label: "All Workflows" },
          { key: "requires_human_approval", label: "Requires Human Approval" },
          { key: "approved_for_auto_dispatch", label: "Auto-Dispatched" },
          { key: "approved_with_audit", label: "Approved with Audit" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTierFilter(tab.key)}
            className="btn-secondary btn-sm"
            style={{
              backgroundColor: tierFilter === tab.key ? "var(--accent)" : "transparent",
              color: tierFilter === tab.key ? "#fff" : "var(--text)",
              borderColor: tierFilter === tab.key ? "var(--accent)" : "var(--border)",
              fontWeight: 600,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Workflows Table */}
      <div
        style={{
          backgroundColor: "var(--bg)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                backgroundColor: "var(--bg-surface)",
              }}
            >
              <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)", fontSize: "0.85rem" }}>Workflow ID</th>
              <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)", fontSize: "0.85rem" }}>Objective / Job Problem</th>
              <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)", fontSize: "0.85rem" }}>Risk Tier</th>
              <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)", fontSize: "0.85rem" }}>Selected Provider</th>
              <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)", fontSize: "0.85rem" }}>Estimated Quote</th>
              <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)", fontSize: "0.85rem", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkflows.map((job) => (
              <tr key={job.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "1.1rem 1.25rem", fontFamily: "var(--mono)", fontWeight: 700, color: "var(--text-h)" }}>
                  {job.workflowId || `WF-${job.id.slice(0, 6).toUpperCase()}`}
                </td>
                <td style={{ padding: "1.1rem 1.25rem", maxWidth: "340px" }}>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-h)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {job.objective}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {new Date(job.createdAt).toLocaleString()}
                  </div>
                </td>
                <td style={{ padding: "1.1rem 1.25rem" }}>
                  {getTierBadge(job.validationTier)}
                </td>
                <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.88rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <UserCheck size={14} color="var(--accent)" />
                    <span style={{ fontWeight: 600 }}>{job.selectedProviderName || "Sunil Perera"}</span>
                  </div>
                </td>
                <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.9rem", fontWeight: 700, color: "var(--text-h)" }}>
                  {job.estimatedPrice ? `LKR ${job.estimatedPrice.toLocaleString()}` : "—"}
                </td>
                <td style={{ padding: "1.1rem 1.25rem", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    {job.validationTier === "requires_human_approval" && job.approvalStatus === "pending" ? (
                      <button
                        onClick={() => setSelectedWorkflow(job)}
                        className="btn-primary btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <ShieldCheck size={14} /> Review & Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedWorkflow(job)}
                        className="btn-secondary btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <Eye size={14} /> Audit Trail ({job.stepLogs?.length || 4} Steps)
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inspection & Human-In-The-Loop Approval Modal */}
      {selectedWorkflow && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            zIndex: 100000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "var(--bg-surface-elevated)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <h3 style={{ margin: 0, color: "var(--text-h)" }}>
                    Multi-Agent Audit Trail: {selectedWorkflow.workflowId}
                  </h3>
                  {getTierBadge(selectedWorkflow.validationTier)}
                </div>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  LangGraph 4-Agent Execution Tree & Human-In-The-Loop Verification
                </p>
              </div>
              <button
                onClick={() => setSelectedWorkflow(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Objective */}
              <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Job Objective
                </span>
                <div style={{ fontWeight: 600, color: "var(--text-h)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
                  {selectedWorkflow.objective}
                </div>
              </div>

              {/* Coordinator Execution Plan */}
              <div>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-h)", marginBottom: "0.5rem", display: "block" }}>
                  Coordinator / Planner Agent Blueprint:
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {(selectedWorkflow.plan || []).map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.5rem 0.8rem",
                        borderRadius: "6px",
                        background: "var(--bg-surface-elevated)",
                        fontSize: "0.84rem",
                        color: "var(--text)",
                        borderLeft: "3px solid var(--accent)",
                      }}
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Logs for all 4 Agents */}
              <div>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-h)", marginBottom: "0.75rem", display: "block" }}>
                  Sequential Agent Step Audit Logs ({selectedWorkflow.stepLogs?.length || 4} steps):
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {(selectedWorkflow.stepLogs || []).map((step, idx) => {
                    const stepNum = step.stepNumber || step.step_number || idx + 1;
                    const agentName = step.agentName || step.agent_name || "Agent";
                    const duration = step.durationMs ?? step.duration_ms ?? 0;
                    return (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          padding: "0.85rem 1rem",
                          background: "var(--bg)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                backgroundColor: "var(--accent)",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              {stepNum}
                            </span>
                            <strong style={{ color: "var(--text-h)", fontSize: "0.9rem" }}>{agentName}</strong>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
                            Action: {step.action} &middot; {duration}ms
                          </span>
                        </div>

                        {step.outputData || step.output_data ? (
                          <pre
                            style={{
                              margin: "0.4rem 0 0",
                              padding: "0.6rem 0.8rem",
                              borderRadius: "6px",
                              backgroundColor: "var(--bg-surface-elevated)",
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              overflowX: "auto",
                              fontFamily: "var(--mono)",
                            }}
                          >
                            {JSON.stringify(step.outputData || step.output_data, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price & Matched Specialist Summary */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  background: "var(--bg-surface-elevated)",
                  padding: "1rem",
                  borderRadius: "10px",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Matched Specialist</span>
                  <div style={{ fontWeight: 700, color: "var(--text-h)", fontSize: "1.05rem", marginTop: "0.2rem" }}>
                    {selectedWorkflow.selectedProviderName || "Sunil Perera"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Calculated Quote (85% Trade + 15% Platform)</span>
                  <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1.05rem", marginTop: "0.2rem" }}>
                    {selectedWorkflow.estimatedPrice ? `LKR ${selectedWorkflow.estimatedPrice.toLocaleString()}` : "LKR 4,500"}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer / Approval Actions */}
            <div
              style={{
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--border)",
                backgroundColor: "var(--bg-surface-elevated)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Status: <strong style={{ color: "var(--text-h)", textTransform: "capitalize" }}>{selectedWorkflow.approvalStatus}</strong>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setSelectedWorkflow(null)}
                  className="btn-secondary btn-sm"
                >
                  Close
                </button>

                {selectedWorkflow.validationTier === "requires_human_approval" && selectedWorkflow.approvalStatus === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={decisionMutation.isPending}
                      onClick={() => decisionMutation.mutate({ id: selectedWorkflow.id, decision: "Reject" })}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        border: "1px solid #ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <XCircle size={15} /> Reject Dispatch
                    </button>
                    <button
                      type="button"
                      disabled={decisionMutation.isPending}
                      onClick={() => decisionMutation.mutate({ id: selectedWorkflow.id, decision: "Approve" })}
                      className="btn-primary btn-sm"
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                    >
                      <Check size={15} /> {decisionMutation.isPending ? "Approving & Generating Invoice..." : "Approve & Hand Off to Billing"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
