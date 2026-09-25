import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { usersApi } from "../../api/users";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import "../payments/Payments.css";

export default function ProviderPayoutDashboard() {
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const { data: summary, isLoading: _isSummaryLoading } = useQuery({
    queryKey: ["providerSummary", userProfile?.id],
    queryFn: () => (userProfile?.id ? paymentsApi.getProviderEarningsSummary(userProfile.id) : Promise.resolve(null)),
    enabled: !!userProfile?.id,
  });

  const { data: payouts = [], isLoading: isPayoutsLoading } = useQuery({
    queryKey: ["providerPayouts", userProfile?.id],
    queryFn: () => (userProfile?.id ? paymentsApi.getProviderPayouts(userProfile.id) : Promise.resolve([])),
    enabled: !!userProfile?.id,
  });

  const totalEarnings = summary?.totalEarnings ?? 0;
  const availableBalance = summary?.availableBalance ?? 0;
  const pendingPayouts = summary?.pendingPayouts ?? 0;
  const completedJobs = summary?.completedJobsCount ?? 0;

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <h1 className="payments-title">Earnings & Payouts</h1>
          <p className="payments-subtitle">
            Track your net earnings, escrow clearances, and automated bank deposits
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link to="/invoices" className="btn-secondary">
            <Receipt size={16} /> Job Invoices & Receipts
          </Link>
          <Link to="/provider/payouts/history" className="btn-secondary">
            <FileSpreadsheet size={16} /> Full Payout History
          </Link>
        </div>
      </div>

      {/* Financial Metrics Overview */}
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Net Earnings</span>
            <span className="stat-value">LKR {totalEarnings.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Available for Payout</span>
            <span className="stat-value">LKR {availableBalance.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper amber">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Pending Escrow Settlement</span>
            <span className="stat-value">LKR {pendingPayouts.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <Briefcase size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Paid Bookings</span>
            <span className="stat-value">{completedJobs}</span>
          </div>
        </div>
      </div>

      {/* Revenue Model Callout */}
      <div
        className="payments-card"
        style={{
          background: "linear-gradient(to right, var(--bg-surface), var(--bg-surface-elevated))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <ShieldCheck size={36} color="var(--accent)" />
          <div>
            <h3 style={{ margin: "0 0 0.25rem", color: "var(--text-h)" }}>
              85% Net Provider Revenue Share
            </h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-muted)" }}>
              Handee charges a transparent 15% platform commission on customer totals. Every verified booking automatically deposits 85% directly to your payout ledger.
            </p>
          </div>
        </div>
        <Link to="/provider/payouts/history" className="btn-primary">
          View Ledger <ArrowRight size={16} />
        </Link>
      </div>

      {/* Recent Payouts Table */}
      <div className="payments-card">
        <div className="payments-card-header">
          <h2 className="payments-card-title">
            <Receipt size={20} color="var(--accent)" />
            Recent Payout Activity
          </h2>
          <Link to="/provider/payouts/history" style={{ fontSize: "0.85rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            View All ({payouts.length})
          </Link>
        </div>

        {isPayoutsLoading ? (
          <p style={{ textAlign: "center", padding: "2rem" }}>Loading payouts...</p>
        ) : payouts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            No payout transactions recorded yet. Complete customer jobs to begin earning.
          </div>
        ) : (
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Payout Ref</th>
                  <th>Booking</th>
                  <th>Created Date</th>
                  <th>Gross Charged</th>
                  <th>15% Platform Fee</th>
                  <th>Net Earnings</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {payouts.slice(0, 5).map((payout) => (
                  <tr key={payout.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {payout.payoutReference || `PAY-${payout.id.slice(0, 8).toUpperCase()}`}
                    </td>
                    <td>#{payout.bookingId.slice(0, 8)}</td>
                    <td>{new Date(payout.createdAt).toLocaleDateString()}</td>
                    <td>LKR {payout.grossAmount.toLocaleString()}</td>
                    <td style={{ color: "var(--text-muted)" }}>-LKR {payout.platformFeeDeducted.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>
                      LKR {payout.netAmount.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge-status ${payout.status}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        to="/invoices"
                        className="btn-secondary btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.3rem 0.6rem" }}
                      >
                        <Receipt size={13} /> View Invoice
                      </Link>
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
