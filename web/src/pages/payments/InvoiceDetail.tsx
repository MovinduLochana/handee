import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { Printer, CreditCard, ArrowLeft, ShieldCheck, CheckCircle } from "lucide-react";
import "./Payments.css";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => paymentsApi.getInvoiceById(id || ""),
    enabled: !!id,
  });

  const { data: payment } = useQuery({
    queryKey: ["invoicePayment", id],
    queryFn: () => paymentsApi.getPaymentByInvoiceId(id || ""),
    enabled: !!id && invoice?.status === "Paid",
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="payments-page">
        <div className="payments-card" style={{ textAlign: "center", padding: "3rem" }}>
          <p>Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="payments-page">
        <div className="payments-card" style={{ textAlign: "center", padding: "3rem" }}>
          <h2>Invoice Not Found</h2>
          <p style={{ color: "var(--text-muted)" }}>
            The requested invoice could not be located or you may not have access to view it.
          </p>
          <Link to="/invoices" className="btn-secondary" style={{ marginTop: "1rem" }}>
            Return to Invoices
          </Link>
        </div>
      </div>
    );
  }

  const parsedItems: Array<{ item: string; price: number; type?: string }> = invoice.lineItemsJson
    ? (() => {
        try {
          const val = JSON.parse(invoice.lineItemsJson);
          return Array.isArray(val) ? val : [{ item: "Service Work", price: invoice.baseAmount }];
        } catch {
          return [{ item: "Completed Service", price: invoice.baseAmount }];
        }
      })()
    : [
        {
          item: "On-site Service Labor",
          price: Math.round(invoice.baseAmount * 0.7),
          type: "Labor",
        },
        {
          item: "Standard Consumables / Parts",
          price: Math.round(invoice.baseAmount * 0.3),
          type: "Materials",
        },
      ];

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/invoices" className="btn-secondary btn-sm">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="payments-title" style={{ fontSize: "var(--text-2xl)" }}>
              Invoice INV-{invoice.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="payments-subtitle">
              Issued on {new Date(invoice.issuedAt).toLocaleDateString()} • Booking #
              {invoice.bookingId.slice(0, 8)}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={handlePrint} className="btn-secondary">
            <Printer size={16} /> Print Receipt
          </button>
          {invoice.status === "Issued" && (
            <Link to={`/invoices/${invoice.id}/pay`} className="btn-primary">
              <CreditCard size={16} /> Pay LKR {invoice.totalAmount.toLocaleString()}
            </Link>
          )}
        </div>
      </div>

      <div className="invoice-receipt">
        <div className="invoice-receipt-header">
          <div>
            <div className="invoice-brand">Handee</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Secure On-Demand Service Marketplace
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Tax / Platform Reg: LK-HD-2026-PAY
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              className={`badge-status ${invoice.status}`}
              style={{ fontSize: "0.9rem", padding: "0.4rem 0.9rem" }}
            >
              {invoice.status === "Paid" && <CheckCircle size={14} />}
              {invoice.status.toUpperCase()}
            </span>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Currency: <strong>{invoice.currency}</strong>
            </div>
          </div>
        </div>

        <div className="invoice-meta-grid">
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              Bill To Customer
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "var(--text-h)",
                fontSize: "1rem",
                marginTop: "0.25rem",
              }}
            >
              {invoice.customerName || "Valued Customer"}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              ID: {invoice.customerId.slice(0, 8)}...
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              Service Provider
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "var(--text-h)",
                fontSize: "1rem",
                marginTop: "0.25rem",
              }}
            >
              {invoice.providerName || "Verified Service Professional"}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              ID: {invoice.providerId.slice(0, 8)}...
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              Payment Date
            </div>
            <div style={{ fontWeight: 600, color: "var(--text-h)", marginTop: "0.25rem" }}>
              {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : "Awaiting Settlement"}
            </div>
            {payment && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Ref: {payment.transactionReference}
              </div>
            )}
          </div>
        </div>

        <div className="payments-table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Service Line Item</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Amount ({invoice.currency})</th>
              </tr>
            </thead>
            <tbody>
              {parsedItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.item}</td>
                  <td>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.2rem 0.5rem",
                        background: "var(--bg-surface-elevated)",
                        borderRadius: "4px",
                      }}
                    >
                      {item.type || "Service Work"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {item.price.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ color: "var(--text-muted)" }}>
                  Platform Protection & Guarantee (15%)
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Escrow Fee</td>
                <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                  {invoice.platformFee.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="invoice-summary-box">
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>
              {invoice.currency} {invoice.baseAmount.toLocaleString()}
            </span>
          </div>
          <div className="summary-row">
            <span>Platform Trust Fee (15%):</span>
            <span>
              {invoice.currency} {invoice.platformFee.toLocaleString()}
            </span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span style={{ color: "var(--accent)" }}>
              {invoice.currency} {invoice.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {invoice.status === "Paid" && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem 1.5rem",
              background: "var(--bg-success)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <ShieldCheck size={28} color="var(--success)" />
            <div>
              <div style={{ fontWeight: 700, color: "var(--text-success)" }}>
                Paid & Verified via Sandbox Payment Gateway
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-success)", opacity: 0.9 }}>
                Funds transferred securely. Provider payout ledger credited with 85% net earnings.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
