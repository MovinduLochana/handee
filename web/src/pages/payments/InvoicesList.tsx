import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { usersApi } from "../../api/users";
import { FileText, CreditCard, Eye, Receipt, CheckCircle2 } from "lucide-react";
import "./Payments.css";

export default function InvoicesList() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["customerInvoices", userProfile?.id],
    queryFn: () =>
      userProfile?.id ? paymentsApi.getCustomerInvoices(userProfile.id) : Promise.resolve([]),
    enabled: !!userProfile?.id,
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === "ALL") return true;
    return inv.status === statusFilter;
  });

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <h1 className="payments-title">My Invoices</h1>
          <p className="payments-subtitle">
            Manage your service receipts, payment records, and outstanding bills
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link to="/account/payment-methods" className="btn-secondary">
            <CreditCard size={16} /> Saved Payment Methods
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {["ALL", "Issued", "Paid", "Cancelled", "Refunded"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className="btn-secondary btn-sm"
            style={{
              backgroundColor: statusFilter === status ? "var(--accent)" : "transparent",
              color: statusFilter === status ? "#fff" : "var(--text)",
              borderColor: statusFilter === status ? "var(--accent)" : "var(--border)",
              fontWeight: 600,
            }}
          >
            {status === "ALL" ? "All Invoices" : status}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="payments-card" style={{ textAlign: "center", padding: "3rem" }}>
          <p>Loading invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div
          className="payments-card"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div className="stat-icon-wrapper blue" style={{ width: 64, height: 64 }}>
            <Receipt size={32} />
          </div>
          <h3 style={{ margin: 0, color: "var(--text-h)" }}>No invoices found</h3>
          <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: 400 }}>
            {statusFilter === "ALL"
              ? "When you complete or accept quotes for bookings, your itemised invoices will appear here."
              : `No invoices currently marked as "${statusFilter}".`}
          </p>
          <Link to="/dashboard" className="btn-primary">
            Explore Services
          </Link>
        </div>
      ) : (
        <div className="payments-card">
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Booking</th>
                  <th>Issued Date</th>
                  <th>Base Rate</th>
                  <th>Platform Fee</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FileText size={16} color="var(--accent)" />
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: "var(--text-h)",
                          }}
                        >
                          INV-{inv.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        #{inv.bookingId.slice(0, 8)}
                      </span>
                    </td>
                    <td>{new Date(inv.issuedAt).toLocaleDateString()}</td>
                    <td>LKR {inv.baseAmount.toLocaleString()}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      LKR {inv.platformFee.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--text-h)" }}>
                      LKR {inv.totalAmount.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge-status ${inv.status}`}>
                        {inv.status === "Paid" && <CheckCircle2 size={12} />}
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <Link to={`/invoices/${inv.id}`} className="btn-secondary btn-sm">
                          <Eye size={14} /> View
                        </Link>
                        {inv.status === "Issued" && (
                          <Link to={`/invoices/${inv.id}/pay`} className="btn-primary btn-sm">
                            <CreditCard size={14} /> Pay Now
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
