import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { usersApi } from "../../api/users";
import { Download, ArrowLeft } from "lucide-react";
import "../payments/Payments.css";

export default function ProviderPayoutHistory() {
  const [filter, setFilter] = useState<string>("ALL");

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["providerPayouts", userProfile?.id],
    queryFn: () =>
      userProfile?.id ? paymentsApi.getProviderPayouts(userProfile.id) : Promise.resolve([]),
    enabled: !!userProfile?.id,
  });

  const filteredPayouts = payouts.filter((p) => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  const handleExportCsv = () => {
    const headers =
      "Payout Ref,Booking ID,Created Date,Gross (LKR),Platform Fee (LKR),Net Amount (LKR),Status\n";
    const rows = filteredPayouts
      .map(
        (p) =>
          `"${p.payoutReference || p.id}","${p.bookingId}","${new Date(p.createdAt).toISOString()}",${p.grossAmount},${p.platformFeeDeducted},${p.netAmount},"${p.status}"`,
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handee-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/provider/payouts" className="btn-secondary btn-sm">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <div>
            <h1 className="payments-title">Payout Ledger & History</h1>
            <p className="payments-subtitle">
              Comprehensive itemised record of all disbursements and platform fees
            </p>
          </div>
        </div>
        <button
          onClick={handleExportCsv}
          className="btn-secondary"
          disabled={filteredPayouts.length === 0}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.75rem",
        }}
      >
        {["ALL", "Pending", "Processing", "Completed", "Failed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className="btn-secondary btn-sm"
            style={{
              backgroundColor: filter === status ? "var(--accent)" : "transparent",
              color: filter === status ? "#fff" : "var(--text)",
              borderColor: filter === status ? "var(--accent)" : "var(--border)",
              fontWeight: 600,
            }}
          >
            {status === "ALL" ? "All Payouts" : status}
          </button>
        ))}
      </div>

      <div className="payments-card">
        {isLoading ? (
          <p style={{ textAlign: "center", padding: "2rem" }}>Loading ledger...</p>
        ) : filteredPayouts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            No payouts matching current filter.
          </div>
        ) : (
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Payout Ref</th>
                  <th>Booking ID</th>
                  <th>Date Initiated</th>
                  <th>Customer Gross</th>
                  <th>15% Handee Fee</th>
                  <th>Net Deposited</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.map((p) => (
                  <tr key={p.id}>
                    <td
                      style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-h)" }}
                    >
                      {p.payoutReference || `PAY-${p.id.slice(0, 8).toUpperCase()}`}
                    </td>
                    <td>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        #{p.bookingId.slice(0, 8)}
                      </span>
                    </td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>LKR {p.grossAmount.toLocaleString()}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      -LKR {p.platformFeeDeducted.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 800, color: "var(--success)" }}>
                      LKR {p.netAmount.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge-status ${p.status}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
