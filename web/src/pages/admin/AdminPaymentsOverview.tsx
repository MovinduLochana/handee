import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Clock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import "../payments/Payments.css";

export default function AdminPaymentsOverview() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");

  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ["adminPaymentsOverview"],
    queryFn: paymentsApi.getAdminPayoutsOverview,
  });

  const processMutation = useMutation({
    mutationFn: (payoutId: string) => paymentsApi.processPayout(payoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPaymentsOverview"] });
    },
  });

  const recentPayouts = overview?.recentPayouts || [];
  const filteredPayouts = recentPayouts.filter((p) => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span className="sandbox-badge">
              <ShieldCheck size={14} /> Financial Audit & Reconciliation
            </span>
          </div>
          <h1 className="payments-title">Platform Payments & Disbursements</h1>
          <p className="payments-subtitle">
            Admin oversight for payment processing, platform commissions (15%), and provider payouts
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw size={16} /> Refresh Metrics
        </button>
      </div>

      {/* Platform Level Metrics */}
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Gross Transaction Volume</span>
            <span className="stat-value">
              LKR {(overview?.totalGrossVolume ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Platform Fees Revenue (15%)</span>
            <span className="stat-value">
              LKR {(overview?.totalPlatformFees ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Disbursed to Providers (85%)</span>
            <span className="stat-value">
              LKR {(overview?.totalPaidOut ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper amber">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Pending Payout Queue</span>
            <span className="stat-value">
              {overview?.pendingPayoutCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Payout Processing Queue */}
      <div className="payments-card">
        <div className="payments-card-header">
          <h2 className="payments-card-title">
            <CreditCard size={20} color="var(--accent)" />
            Disbursement Queue & Settlement
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["ALL", "Pending", "Processing", "Completed"].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className="btn-secondary btn-sm"
                style={{
                  backgroundColor: filter === st ? "var(--accent)" : "transparent",
                  color: filter === st ? "#fff" : "var(--text)",
                  borderColor: filter === st ? "var(--accent)" : "var(--border)",
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p style={{ textAlign: "center", padding: "2rem" }}>Loading settlement data...</p>
        ) : filteredPayouts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            No disbursements recorded in the platform ledger.
          </div>
        ) : (
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Payout ID</th>
                  <th>Provider</th>
                  <th>Booking ID</th>
                  <th>Gross Charged</th>
                  <th>15% Platform Commission</th>
                  <th>Net Payout</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {payout.payoutReference || `PAY-${payout.id.slice(0, 8).toUpperCase()}`}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-h)" }}>
                        {payout.providerName || "Service Provider"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        ID: {payout.providerId.slice(0, 8)}...
                      </div>
                    </td>
                    <td>#{payout.bookingId.slice(0, 8)}</td>
                    <td>LKR {payout.grossAmount.toLocaleString()}</td>
                    <td style={{ color: "var(--accent)", fontWeight: 600 }}>
                      +LKR {payout.platformFeeDeducted.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>
                      LKR {payout.netAmount.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge-status ${payout.status}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {payout.status === "Pending" ? (
                        <button
                          onClick={() => processMutation.mutate(payout.id)}
                          disabled={processMutation.isPending}
                          className="btn-primary btn-sm"
                        >
                          {processMutation.isPending ? "Disbursing..." : "Approve & Settle"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          Settled
                        </span>
                      )}
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
