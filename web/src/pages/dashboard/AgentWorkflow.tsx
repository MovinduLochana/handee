import { Activity, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function AgentWorkflow() {
  const jobs = [
    {
      id: "JOB-948",
      type: "AC Repair",
      status: "pending_approval",
      risk: "High",
      agent: "Validation/Safety",
    },
    {
      id: "JOB-947",
      type: "Plumbing",
      status: "approved_with_audit",
      risk: "Medium",
      agent: "Validation/Safety",
    },
    {
      id: "JOB-946",
      type: "Painting",
      status: "approved_for_auto_dispatch",
      risk: "Low",
      agent: "Validation/Safety",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_approval":
        return <Clock size={16} style={{ color: "#eab308" }} />;
      case "approved_with_audit":
        return <AlertCircle size={16} style={{ color: "#3b82f6" }} />;
      case "approved_for_auto_dispatch":
        return <CheckCircle size={16} style={{ color: "#22c55e" }} />;
      default:
        return <Activity size={16} />;
    }
  };

  return (
    <div>
      <h1 style={{ fontFamily: "var(--heading)", marginBottom: "1rem" }}>
        Agent Monitoring & Approval
      </h1>
      <p style={{ color: "var(--text)", marginBottom: "3rem", maxWidth: "800px", lineHeight: 1.6 }}>
        Monitor active AI workflow runs. Jobs flagged as high risk require manual approval before
        dispatch per the Human-in-the-Loop policy.
      </p>

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
                backgroundColor: "var(--social-bg)",
              }}
            >
              <th style={{ padding: "1rem 1.5rem", fontWeight: 600, color: "var(--text-h)" }}>
                Job ID
              </th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: 600, color: "var(--text-h)" }}>
                Category
              </th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: 600, color: "var(--text-h)" }}>
                Current Pipeline State
              </th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: 600, color: "var(--text-h)" }}>
                Risk Tier
              </th>
              <th style={{ padding: "1rem 1.5rem", fontWeight: 600, color: "var(--text-h)" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "1.25rem 1.5rem", fontWeight: 500, color: "var(--text-h)" }}>
                  {job.id}
                </td>
                <td style={{ padding: "1.25rem 1.5rem" }}>{job.type}</td>
                <td style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {getStatusIcon(job.status)}
                    <span style={{ fontSize: "0.9rem", fontFamily: "var(--mono)" }}>
                      {job.status}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "1.25rem 1.5rem" }}>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "999px",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      backgroundColor:
                        job.risk === "High"
                          ? "rgba(239, 68, 68, 0.1)"
                          : job.risk === "Medium"
                            ? "rgba(59, 130, 246, 0.1)"
                            : "rgba(34, 197, 94, 0.1)",
                      color:
                        job.risk === "High"
                          ? "#ef4444"
                          : job.risk === "Medium"
                            ? "#3b82f6"
                            : "#22c55e",
                    }}
                  >
                    {job.risk}
                  </span>
                </td>
                <td style={{ padding: "1.25rem 1.5rem" }}>
                  {job.status === "pending_approval" ? (
                    <button
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "var(--text-h)",
                        color: "var(--bg)",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Review
                    </button>
                  ) : (
                    <button
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "transparent",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Audit Trail
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
