import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, type ProcessPaymentRequestDto } from "../../api/payments";
import {
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import "./Payments.css";

const PRESET_SANDBOX_CARDS = [
  { name: "Stripe Demo Card", number: "4242 •••• •••• 4242", last4: "4242", brand: "Visa", exp: "12/28", token: "tok_visa_sandbox" },
  { name: "Mastercard Test", number: "5555 •••• •••• 5555", last4: "5555", brand: "Mastercard", exp: "08/29", token: "tok_mc_sandbox" },
  { name: "PayHere Demo Wallet", number: "7777 •••• •••• 7777", last4: "7777", brand: "PayHere", exp: "11/30", token: "tok_payhere_sandbox" },
];

export default function CheckoutPayment() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [selectedCardIdx, setSelectedCardIdx] = useState(0);
  const [customCard, setCustomCard] = useState({
    number: "4242 4242 4242 4242",
    name: "John Doe (Sandbox)",
    expiry: "12/28",
    cvc: "123",
  });
  const [paymentSuccess, setPaymentSuccess] = useState<{
    reference: string;
    amount: number;
    currency: string;
  } | null>(null);

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => paymentsApi.getInvoiceById(id || ""),
    enabled: !!id,
  });

  const payMutation = useMutation({
    mutationFn: (dto: ProcessPaymentRequestDto) => paymentsApi.processPayment(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["customerInvoices"] });
      setPaymentSuccess({
        reference: data.transactionReference,
        amount: data.amount,
        currency: data.currency,
      });
    },
  });

  const handlePay = () => {
    if (!invoice) return;
    const card = PRESET_SANDBOX_CARDS[selectedCardIdx];
    payMutation.mutate({
      invoiceId: invoice.id,
      paymentMethod: "card",
      paymentToken: card.token,
      last4: card.last4,
      gatewayProvider: "Stripe-Sandbox",
    });
  };

  if (isLoading) {
    return (
      <div className="payments-page">
        <div className="payments-card" style={{ textAlign: "center", padding: "3rem" }}>
          <p>Initializing secure checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="payments-page">
        <div className="payments-card" style={{ textAlign: "center", padding: "3rem" }}>
          <h2>Invoice not found</h2>
          <Link to="/invoices" className="btn-secondary" style={{ marginTop: "1rem" }}>
            Return to Invoices
          </Link>
        </div>
      </div>
    );
  }

  if (invoice.status === "Paid" && !paymentSuccess) {
    return (
      <div className="payments-page">
        <div className="payments-card" style={{ textAlign: "center", padding: "3rem" }}>
          <CheckCircle2 size={48} color="var(--success)" style={{ margin: "0 auto 1rem" }} />
          <h2>Invoice Already Settled</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            This invoice has already been paid successfully.
          </p>
          <Link to={`/invoices/${invoice.id}`} className="btn-primary">
            View Receipt
          </Link>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="payments-page">
        <div
          className="payments-card"
          style={{
            maxWidth: 600,
            margin: "2rem auto",
            textAlign: "center",
            padding: "3.5rem 2rem",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--bg-success)",
              color: "var(--success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <CheckCircle2 size={40} />
          </div>
          <h1 style={{ fontSize: "var(--text-2xl)", color: "var(--text-h)", marginBottom: "0.5rem" }}>
            Payment Successful!
          </h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Your transaction has been confirmed by the sandbox gateway and the service provider payout ledger has been credited.
          </p>

          <div
            style={{
              background: "var(--bg-surface-elevated)",
              borderRadius: "12px",
              padding: "1.25rem",
              textAlign: "left",
              marginBottom: "2rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Amount Paid:</span>
              <strong style={{ color: "var(--text-h)" }}>{paymentSuccess.currency} {paymentSuccess.amount.toLocaleString()}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Transaction Ref:</span>
              <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--accent)" }}>{paymentSuccess.reference}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Gateway:</span>
              <span>Stripe Sandbox (Polly Resilient)</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link to={`/invoices/${invoice.id}`} className="btn-secondary">
              View Itemised Receipt
            </Link>
            <Link to="/invoices" className="btn-primary">
              Done <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span className="sandbox-badge">
              <Lock size={12} /> Sandbox Payment Gateway
            </span>
          </div>
          <h1 className="payments-title">Secure Checkout</h1>
          <p className="payments-subtitle">
            Complete settlement for Invoice <strong>INV-{invoice.id.slice(0, 8).toUpperCase()}</strong>
          </p>
        </div>
        <Link to={`/invoices/${invoice.id}`} className="btn-secondary">
          Cancel
        </Link>
      </div>

      {payMutation.isError && (
        <div
          className="payments-card"
          style={{
            backgroundColor: "var(--bg-danger)",
            color: "var(--text-danger)",
            borderLeft: "4px solid var(--text-danger)",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <AlertTriangle size={20} />
            <div>
              <strong>Payment Failed:</strong> {(payMutation.error as any)?.response?.data?.message || (payMutation.error as Error)?.message || "Sandbox card declined. Please try again."}
            </div>
          </div>
        </div>
      )}

      <div className="checkout-grid">
        {/* Payment Form & Card Selector */}
        <div>
          <div className="payments-card">
            <h2 className="payments-card-title">
              <CreditCard size={20} color="var(--accent)" />
              Choose Sandbox Payment Card
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Select a pre-configured testing card or inspect simulated card parameters below.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
              {PRESET_SANDBOX_CARDS.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedCardIdx(idx);
                    setCustomCard((prev) => ({
                      ...prev,
                      number: card.number.replace(/•/g, "4"),
                      expiry: card.exp,
                    }));
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    borderRadius: "10px",
                    border: selectedCardIdx === idx ? "2px solid var(--accent)" : "1px solid var(--border)",
                    backgroundColor: selectedCardIdx === idx ? "oklch(45% 0.2 260 / 0.05)" : "var(--bg-surface)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: selectedCardIdx === idx ? "5px solid var(--accent)" : "2px solid var(--border)",
                        background: "#fff",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-h)" }}>{card.name}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{card.number}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                    Exp {card.exp}
                  </span>
                </div>
              ))}
            </div>

            {/* Interactive Card Simulator Display */}
            <div className="card-simulator">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-simulator-chip" />
                <span style={{ fontWeight: 700, letterSpacing: "0.05em" }}>
                  {PRESET_SANDBOX_CARDS[selectedCardIdx].brand}
                </span>
              </div>
              <div className="card-simulator-number">{customCard.number}</div>
              <div className="card-simulator-footer">
                <div>
                  <div style={{ fontSize: "0.6rem", opacity: 0.7 }}>Card Holder</div>
                  <div>{customCard.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.6rem", opacity: 0.7 }}>Expires</div>
                  <div>{customCard.expiry}</div>
                </div>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={payMutation.isPending}
              className="btn-primary"
              style={{ width: "100%", padding: "0.9rem", fontSize: "1rem" }}
            >
              <Lock size={16} />
              {payMutation.isPending
                ? "Simulating Gateway Processing..."
                : `Authorize & Pay LKR ${invoice.totalAmount.toLocaleString()}`}
            </button>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="payments-card">
            <h3 className="payments-card-title" style={{ fontSize: "1.1rem" }}>
              Order Breakdown
            </h3>

            <div style={{ margin: "1rem 0 1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text)" }}>Service Base Charge:</span>
                <span style={{ fontWeight: 600 }}>LKR {invoice.baseAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Platform Trust Fee (15%):</span>
                <span style={{ color: "var(--text-muted)" }}>LKR {invoice.platformFee.toLocaleString()}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border)",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "var(--text-h)",
                }}
              >
                <span>Total Due:</span>
                <span style={{ color: "var(--accent)" }}>LKR {invoice.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-surface-elevated)",
                borderRadius: "10px",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-h)", fontWeight: 600 }}>
                <ShieldCheck size={16} color="var(--success)" />
                Escrow Protected Payment
              </div>
              <div>
                Platform retains funds until service completion is confirmed. The provider is directly credited upon your payment.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
