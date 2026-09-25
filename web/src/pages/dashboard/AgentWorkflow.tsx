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
        return <Clock size={16} style={{ color: "#eab308" }} />;
      case "approved":
        return <CheckCircle size={16} style={{ color: "#22c55e" }} />;
      case "rejected":
        return <XCircle size={16} style={{ color: "#ef4444" }} />;
      case "revised":
        return <RefreshCw size={16} style={{ color: "#3b82f6" }} />;
      default:
        return <Activity size={16} />;
    }
  };

  const getTierBadge = (tier: string) => {
    const t = tier.toLowerCase();
    if (t === "approved_for_auto_dispatch") {
      return (
        <span
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.82rem",
            fontWeight: 600,
            backgroundColor: "rgba(34, 197, 94, 0.12)",
            color: "#22c55e",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <CheckCircle size={13} /> Auto-Dispatch
        </span>
      );
    }
    if (t === "approved_with_audit") {
      return (
        <span
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.82rem",
            fontWeight: 600,
            backgroundColor: "rgba(59, 130, 246, 0.12)",
            color: "#3b82f6",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <AlertCircle size={13} /> Audit Required
        </span>
      );
    }
    return (
      <span
        style={{
          padding: "0.25rem 0.75rem",
          borderRadius: "999px",
          fontSize: "0.82rem",
          fontWeight: 600,
          backgroundColor: "rgba(239, 68, 68, 0.12)",
          color: "#ef4444",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
        }}
      >
        <Shield size={13} /> Human Approval
      </span>
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
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{ fontFamily: "var(--heading)", fontSize: "1.875rem", marginBottom: "0.5rem" }}
          >
            Agent Monitoring & HITL Governance
          </h1>
          <p style={{ color: "var(--text)", maxWidth: "800px", lineHeight: 1.6 }}>
            Supervise the four-agent dispatch pipeline. Matches flagged as high risk require manual
            administrator review before job dispatch under the Human-in-the-Loop policy.
          </p>
        </div>
        <button
          onClick={fetchWorkflows}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.1rem",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 500,
            color: "var(--text-h)",
          }}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            backgroundColor: "var(--bg)",
            padding: "1.25rem",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text)", marginBottom: "0.25rem" }}>
            Total Runs
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-h)" }}>
            {totalCount}
          </div>
        </div>
        <div
          style={{
            backgroundColor: "var(--bg)",
            padding: "1.25rem",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text)", marginBottom: "0.25rem" }}>
            Requires Human Approval
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: pendingCount > 0 ? "#ef4444" : "var(--text-h)",
            }}
          >
            {pendingCount}
          </div>
        </div>
        <div
          style={{
            backgroundColor: "var(--bg)",
            padding: "1.25rem",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text)", marginBottom: "0.25rem" }}>
            Approved With Audit
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#3b82f6" }}>{auditCount}</div>
        </div>
        <div
          style={{
            backgroundColor: "var(--bg)",
            padding: "1.25rem",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text)", marginBottom: "0.25rem" }}>
            Auto-Dispatched
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#22c55e" }}>
            {autoDispatchCount}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginRight: "1rem",
            color: "var(--text)",
          }}
        >
          <SlidersHorizontal size={16} /> Filter Tier:
        </div>
        {[
          { key: "all", label: "All Tiers" },
          { key: "requires_human_approval", label: "Requires Approval" },
          { key: "approved_with_audit", label: "Audit Required" },
          { key: "approved_for_auto_dispatch", label: "Auto-Dispatch" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTier(tab.key)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              backgroundColor: selectedTier === tab.key ? "var(--text-h)" : "var(--bg)",
              color: selectedTier === tab.key ? "var(--bg)" : "var(--text)",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {tab.label}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          {[
            { key: "all", label: "All Status" },
            { key: "pending", label: "Pending" },
            { key: "approved", label: "Approved" },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => setSelectedStatus(st.key)}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: selectedStatus === st.key ? "var(--text-h)" : "var(--bg)",
                color: selectedStatus === st.key ? "var(--bg)" : "var(--text)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workflows Table */}
      <div
        style={{
          backgroundColor: "var(--bg)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 1rem" }} />
            Loading agent workflows...
          </div>
        ) : error ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#ef4444" }}>
            <AlertCircle size={24} style={{ margin: "0 auto 1rem" }} />
            {error}
          </div>
        ) : workflows.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text)" }}>
            No agent workflows match the selected criteria.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "var(--social-bg)",
                }}
              >
                <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)" }}>
                  Job / Workflow
                </th>
                <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)" }}>
                  Objective
                </th>
                <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)" }}>
                  Candidate Provider
                </th>
                <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)" }}>
                  Quote
                </th>
                <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)" }}>
                  Risk Tier
                </th>
                <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)" }}>
                  Approval
                </th>
                <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-h)" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => (
                <tr key={wf.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "1.25rem", fontWeight: 500, color: "var(--text-h)" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.85rem" }}>
                      {wf.workflowId || wf.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text)", marginTop: "0.2rem" }}>
                      {new Date(wf.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: "1.25rem", maxWidth: "260px" }}>
                    <div
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: "0.9rem",
                      }}
                    >
                      {wf.objective}
                    </div>
                  </td>
                  <td style={{ padding: "1.25rem" }}>
                    {wf.selectedProviderName ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          fontSize: "0.9rem",
                        }}
                      >
                        <UserCheck size={15} style={{ color: "#22c55e" }} />
                        {wf.selectedProviderName}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                        None Assigned
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "1.25rem", fontFamily: "var(--mono)", fontWeight: 600 }}>
                    {wf.estimatedPrice ? `Rs. ${wf.estimatedPrice.toLocaleString()}` : "—"}
                  </td>
                  <td style={{ padding: "1.25rem" }}>{getTierBadge(wf.validationTier)}</td>
                  <td style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {getStatusIcon(wf.approvalStatus)}
                      <span style={{ fontSize: "0.85rem", textTransform: "capitalize" }}>
                        {wf.approvalStatus}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "1.25rem" }}>
                    <button
                      onClick={() => {
                        setSelectedWorkflow(wf);
                        setActionSuccess(null);
                        setDecisionNote("");
                      }}
                      style={{
                        padding: "0.45rem 0.9rem",
                        backgroundColor:
                          wf.approvalStatus.toLowerCase() === "pending"
                            ? "var(--text-h)"
                            : "transparent",
                        color:
                          wf.approvalStatus.toLowerCase() === "pending"
                            ? "var(--bg)"
                            : "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontSize: "0.85rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      {wf.approvalStatus.toLowerCase() === "pending" ? "Review" : "Audit"}
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Review & Audit Modal Drawer */}
      {selectedWorkflow && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
          onClick={() => setSelectedWorkflow(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "640px",
              backgroundColor: "var(--bg-surface, var(--bg))",
              height: "100dvh",
              maxHeight: "100vh",
              boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderLeft: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Sticky Header */}
            <div
              style={{
                flexShrink: 0,
                padding: "1.25rem 1.75rem",
                borderBottom: "1px solid var(--border)",
                backgroundColor: "var(--bg-surface-elevated, var(--bg))",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontFamily: "var(--mono)",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      backgroundColor: "var(--social-bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text-h)",
                      fontWeight: 600,
                    }}
                  >
                    {selectedWorkflow.workflowId || selectedWorkflow.id.slice(0, 8)}
                  </span>
                  {getTierBadge(selectedWorkflow.validationTier)}
                </div>
                <h2
                  style={{
                    fontFamily: "var(--heading)",
                    fontSize: "1.35rem",
                    fontWeight: 700,
                    color: "var(--text-h)",
                    margin: 0,
                  }}
                >
                  Workflow Audit & Governance
                </h2>
                <div
                  style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}
                >
                  Initiated: {new Date(selectedWorkflow.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkflow(null)}
                aria-label="Close audit drawer"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  width: "34px",
                  height: "34px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div
              style={{
                flex: "1 1 auto",
                overflowY: "auto",
                padding: "1.5rem 1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                minHeight: 0,
              }}
            >
              {/* Success alert */}
              {actionSuccess && (
                <div
                  style={{
                    padding: "0.85rem 1.1rem",
                    backgroundColor: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    color: "#16a34a",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  <CheckCircle size={18} />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Job Summary & Provider Overview Card */}
              <div
                style={{
                  backgroundColor: "var(--social-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.4rem",
                  }}
                >
                  Customer Job Request
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--text-h)",
                    fontSize: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  {selectedWorkflow.objective}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
                    fontSize: "0.85rem",
                    paddingTop: "0.85rem",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      Candidate Provider:
                    </span>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--text-h)",
                        marginTop: "0.2rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      {selectedWorkflow.selectedProviderName ? (
                        <>
                          <UserCheck size={15} style={{ color: "#22c55e" }} />
                          {selectedWorkflow.selectedProviderName}
                        </>
                      ) : (
                        <span style={{ color: "var(--text)" }}>None Assigned</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      Estimated Quote:
                    </span>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--text-h)",
                        marginTop: "0.2rem",
                        fontFamily: "var(--mono)",
                        fontSize: "1rem",
                      }}
                    >
                      {selectedWorkflow.estimatedPrice
                        ? `Rs. ${selectedWorkflow.estimatedPrice.toLocaleString()}`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      Approval Status:
                    </span>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--text-h)",
                        marginTop: "0.2rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        textTransform: "capitalize",
                      }}
                    >
                      {getStatusIcon(selectedWorkflow.approvalStatus)}
                      {selectedWorkflow.approvalStatus}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      Job Request ID:
                    </span>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        color: "var(--text-h)",
                        marginTop: "0.2rem",
                        fontSize: "0.82rem",
                      }}
                    >
                      {selectedWorkflow.jobRequestId || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Rules & Audit Checklist */}
              {(() => {
                const res = parseFinalResult(selectedWorkflow.finalResultJson);
                const rules = res?.evaluated_rules || [];
                const reasons = res?.reasons || [];
                return (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.6rem",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          margin: 0,
                          color: "var(--text-h)",
                        }}
                      >
                        Validation Rules & Audit Checklist
                      </h3>
                      {rules.length > 0 && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            fontFamily: "var(--mono)",
                          }}
                        >
                          {rules.filter((r: any) => r.passed).length}/{rules.length} Passed
                        </span>
                      )}
                    </div>

                    {reasons.length > 0 && (
                      <div
                        style={{
                          padding: "0.8rem 1rem",
                          backgroundColor: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: "8px",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: "#dc2626",
                            marginBottom: "0.3rem",
                          }}
                        >
                          Flagged Safety Concerns:
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "1.2rem",
                            fontSize: "0.82rem",
                            color: "var(--text-h)",
                          }}
                        >
                          {reasons.map((r: string, i: number) => (
                            <li key={i} style={{ marginBottom: "0.2rem" }}>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rules.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {rules.map((rule: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: "0.75rem",
                              padding: "0.75rem 0.9rem",
                              borderRadius: "8px",
                              border: `1px solid ${rule.passed ? "rgba(34, 197, 94, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                              backgroundColor: rule.passed
                                ? "rgba(34, 197, 94, 0.05)"
                                : "rgba(239, 68, 68, 0.05)",
                              fontSize: "0.85rem",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.45rem",
                                  marginBottom: "0.2rem",
                                }}
                              >
                                <span style={{ fontWeight: 600, color: "var(--text-h)" }}>
                                  {rule.rule_name}
                                </span>
                                {rule.rule_id && (
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontFamily: "var(--mono)",
                                      padding: "0.1rem 0.4rem",
                                      borderRadius: "4px",
                                      backgroundColor: "var(--bg)",
                                      border: "1px solid var(--border)",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {rule.rule_id}
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--text)",
                                  lineHeight: 1.4,
                                }}
                              >
                                {rule.message}
                              </div>
                            </div>
                            <div style={{ marginTop: "2px" }}>
                              {rule.passed ? (
                                <CheckCircle size={18} color="#22c55e" />
                              ) : (
                                <XCircle size={18} color="#ef4444" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-muted)",
                          padding: "0.5rem 0",
                        }}
                      >
                        No granular rule checks recorded in workflow payload.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Agent Execution Steps */}
              <div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    marginBottom: "0.6rem",
                    color: "var(--text-h)",
                  }}
                >
                  Agent Execution Steps
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {selectedWorkflow.stepLogs && selectedWorkflow.stepLogs.length > 0 ? (
                    selectedWorkflow.stepLogs.map((step) => {
                      const stepKey = step.id || step.stepNumber;
                      const isExpanded = !!expandedSteps[stepKey];
                      return (
                        <div
                          key={stepKey}
                          style={{
                            padding: "0.85rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--bg)",
                            fontSize: "0.85rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "0.3rem",
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "var(--text-h)" }}>
                              Step {step.stepNumber}: {step.agentName}
                            </span>
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontFamily: "var(--mono)",
                                fontSize: "0.72rem",
                                padding: "0.15rem 0.45rem",
                                borderRadius: "4px",
                                backgroundColor: "var(--social-bg)",
                              }}
                            >
                              {step.durationMs}ms
                            </span>
                          </div>
                          <div
                            style={{
                              color: "var(--text)",
                              fontSize: "0.8rem",
                              marginBottom: step.outputData ? "0.4rem" : 0,
                            }}
                          >
                            Action:{" "}
                            <code style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>
                              {step.action}
                            </code>
                          </div>
                          {step.outputData && (
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleStepExpand(stepKey)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  padding: 0,
                                  color: "var(--text-muted)",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  marginTop: "0.2rem",
                                  textDecoration: "underline",
                                }}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronDown size={13} /> Hide Payload
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight size={13} /> View Output Payload
                                  </>
                                )}
                              </button>
                              {isExpanded && (
                                <div
                                  style={{
                                    marginTop: "0.4rem",
                                    padding: "0.6rem",
                                    backgroundColor: "var(--social-bg)",
                                    borderRadius: "6px",
                                    fontFamily: "var(--mono)",
                                    fontSize: "0.73rem",
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    wordBreak: "break-all",
                                    whiteSpace: "pre-wrap",
                                    border: "1px solid var(--border)",
                                  }}
                                >
                                  {step.outputData}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      No detailed step logs recorded for this workflow run.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer (flex-shrink: 0, ALWAYS visible, NEVER cut off!) */}
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid var(--border)",
                padding: "1.25rem 1.75rem",
                backgroundColor: "var(--bg-surface-elevated, var(--bg))",
                boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.05)",
                zIndex: 10,
              }}
            >
              {selectedWorkflow.approvalStatus.toLowerCase() === "pending" ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.45rem",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        margin: 0,
                        color: "var(--text-h)",
                      }}
                    >
                      Record HITL Decision
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Action required
                    </span>
                  </div>
                  <textarea
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Optional review note or feedback..."
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-strong, var(--border))",
                      backgroundColor: "var(--bg)",
                      color: "var(--text-h)",
                      fontSize: "0.85rem",
                      marginBottom: "0.75rem",
                      resize: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                  <div
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}
                  >
                    <button
                      type="button"
                      disabled={submittingDecision}
                      onClick={() => handleDecision("Approve")}
                      style={{
                        padding: "0.65rem 0.5rem",
                        backgroundColor: "#16a34a",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: submittingDecision ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem",
                        boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
                        opacity: submittingDecision ? 0.7 : 1,
                      }}
                    >
                      <CheckCircle size={15} />
                      Approve Match
                    </button>
                    <button
                      type="button"
                      disabled={submittingDecision}
                      onClick={() => handleDecision("Revise")}
                      style={{
                        padding: "0.65rem 0.5rem",
                        backgroundColor: "#d97706",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: submittingDecision ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem",
                        boxShadow: "0 2px 4px rgba(217, 119, 6, 0.2)",
                        opacity: submittingDecision ? 0.7 : 1,
                      }}
                    >
                      <RefreshCw size={15} />
                      Request Revision
                    </button>
                    <button
                      type="button"
                      disabled={submittingDecision}
                      onClick={() => handleDecision("Reject")}
                      style={{
                        padding: "0.65rem 0.5rem",
                        backgroundColor: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: submittingDecision ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem",
                        boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
                        opacity: submittingDecision ? 0.7 : 1,
                      }}
                    >
                      <XCircle size={15} />
                      Reject Match
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Decision recorded on:{" "}
                      {selectedWorkflow.decidedAt
                        ? new Date(selectedWorkflow.decidedAt).toLocaleString()
                        : "System Auto-Dispatch"}
                    </div>
                    {selectedWorkflow.decisionNote && (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-h)",
                          marginTop: "0.2rem",
                          fontStyle: "italic",
                        }}
                      >
                        "{selectedWorkflow.decisionNote}"
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkflow(null)}
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg)",
                      color: "var(--text-h)",
                      fontSize: "0.82rem",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
