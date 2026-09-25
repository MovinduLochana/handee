import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import "./Payments.css";

export default function QuoteReview() {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAccepted, setIsAccepted] = useState(false);

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["bookingInvoice", bookingId],
    queryFn: () => paymentsApi.getInvoiceByBookingId(bookingId || ""),
    enabled: !!bookingId,
    retry: 1,
  });

  // Fallback quote values if invoice is still in estimation or draft
  const baseAmount = invoice?.baseAmount ?? 4500;
  const platformFee = invoice?.platformFee ?? Math.round(baseAmount * 0.15);
  const totalAmount = invoice?.totalAmount ?? (baseAmount + platformFee);

  const parsedItems: Array<{ item: string; price: number; type?: string }> = invoice?.lineItemsJson
    ? (() => {
        try {
          const val = JSON.parse(invoice.lineItemsJson);
          return Array.isArray(val) ? val : [{ item: "Service Work", price: baseAmount }];
        } catch {
          return [{ item: "Estimated Service", price: baseAmount }];
        }
      })()
    : [
        { item: "Standard Labor & Service", price: Math.round(baseAmount * 0.7), type: "Labor" },
        { item: "Consumables & Parts Allowance", price: Math.round(baseAmount * 0.3), type: "Materials" },
      ];

  const handleAcceptQuote = () => {
    setIsAccepted(true);
    if (invoice?.id) {
      navigate(`/invoices/${invoice.id}/pay`);
    } else {
      navigate("/invoices");
    }
  };

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span className="sandbox-badge">
              <Zap size={14} /> AI Estimate & Verified Quote
            </span>
          </div>
          <h1 className="payments-title">Quote Review</h1>
          <p className="payments-subtitle">
            Booking Ref: <strong style={{ color: "var(--text-h)" }}>{bookingId?.slice(0, 8)}...</strong> • Transparent breakdown with zero hidden fees
          </p>
        </div>
        <Link to="/bookings" className="btn-secondary">
          Back to Bookings
        </Link>
      </div>

      {isLoading && (
        <div className="payments-card" style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p>Calculating verified quote breakdown...</p>
        </div>
      )}

      {error && !invoice && (
        <div
          className="payments-card"
          style={{
            borderLeft: "4px solid var(--warning)",
            backgroundColor: "var(--bg-warning)",
            color: "var(--text-warning)",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>Using Estimated Baseline:</strong> Detailed invoice is pending provider dispatch. Below is the automated AI baseline quote for this category.
            </div>
          </div>
        </div>
      )}

      <div className="checkout-grid">
        <div>
          <div className="payments-card">
            <div className="payments-card-header">
              <h2 className="payments-card-title">
                <FileText size={20} color="var(--accent)" />
                Itemised Service Estimate
              </h2>
              <span className="badge-status Issued">Price Locked</span>
            </div>

            <div className="payments-table-container">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Type</th>
                    <th style={{ textAlign: "right" }}>Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((line, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{line.item}</td>
                      <td>
                        <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", background: "var(--bg-surface-elevated)", borderRadius: "4px" }}>
                          {line.type || "Service"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {line.price.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ color: "var(--text-muted)" }}>Platform Trust & Safety Fee</td>
                    <td>
                      <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", background: "oklch(45% 0.2 260 / 0.1)", color: "var(--accent)", borderRadius: "4px" }}>
                        15% Included
                      </span>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      {platformFee.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="invoice-summary-box">
              <div className="summary-row">
                <span>Base Service Rate:</span>
                <span>LKR {baseAmount.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Trust & Platform Fee (15%):</span>
                <span>LKR {platformFee.toLocaleString()}</span>
              </div>
              <div className="summary-row total">
                <span>Total Payable:</span>
                <span style={{ color: "var(--accent)" }}>LKR {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div
            className="payments-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-h)" }}>
                Ready to confirm this quote?
              </h3>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Your payment will only be released to the provider upon your satisfaction.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn-primary"
                onClick={handleAcceptQuote}
                disabled={isAccepted}
              >
                <CheckCircle2 size={16} />
                Accept Quote & Pay
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="payments-card">
            <h3 className="payments-card-title" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
              <ShieldCheck size={22} color="var(--success)" />
              Handee Guarantee
            </h3>
            <ul style={{ paddingLeft: "1.2rem", margin: "0 0 1.5rem", fontSize: "0.88rem", color: "var(--text)", lineHeight: "1.7" }}>
              <li>
                <strong>Escrow Protection:</strong> Funds remain securely held in sandbox escrow until you approve job completion.
              </li>
              <li>
                <strong>No Surprise Surges:</strong> Quote is binding for the initial agreed scope of work.
              </li>
              <li>
                <strong>Dispute Resolution:</strong> 24/7 dedicated mediation if work does not match criteria.
              </li>
            </ul>

            <div
              style={{
                backgroundColor: "var(--bg-surface-elevated)",
                borderRadius: "10px",
                padding: "1rem",
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
              }}
            >
              <HelpCircle size={20} color="var(--text-muted)" />
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Need adjustments or extra parts added? Contact your assigned provider through the booking chat.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
