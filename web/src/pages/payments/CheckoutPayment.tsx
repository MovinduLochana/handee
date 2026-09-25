import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, type ProcessPaymentRequestDto } from "../../api/payments";
import { usersApi } from "../../api/users";
import { usePaymentMethods } from "../../lib/paymentMethodsStore";
import {
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Sparkles,
} from "lucide-react";
import "./Payments.css";

export default function CheckoutPayment() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const {
    methods,
    addCard,
  } = usePaymentMethods(userProfile?.id, userProfile?.fullName || "TEST CUSTOMER");

  const [selectedId, setSelectedId] = useState<string>("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCard, setQuickCard] = useState({
    brand: "Visa",
    last4: "8888",
    expiryMonth: 12,
    expiryYear: 2029,
    name: "Quick Checkout Card",
  });

  const [paymentSuccess, setPaymentSuccess] = useState<{
    reference: string;
    amount: number;
    currency: string;
  } | null>(null);

  const [prevUserId, setPrevUserId] = useState<string | undefined>(userProfile?.id);

  // Automatically select default card or update selection when user profile finishes loading
  useEffect(() => {
    if (userProfile?.id !== prevUserId) {
      setPrevUserId(userProfile?.id);
      const def = methods.find((m) => m.isDefault) || methods[0];
      if (def) {
        setSelectedId(def.id);
      }
      return;
    }

    if (methods.length > 0) {
      if (!selectedId || !methods.some((m) => m.id === selectedId)) {
        const def = methods.find((m) => m.isDefault) || methods[0];
        if (def) {
          setSelectedId(def.id);
        }
      }
    }
  }, [userProfile?.id, methods, selectedId, prevUserId]);

  const activeCard =
    methods.find((m) => m.id === selectedId) ||
    methods.find((m) => m.isDefault) ||
    methods[0];

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
    if (!invoice || !activeCard) return;
    payMutation.mutate({
      invoiceId: invoice.id,
      paymentMethod: "card",
      paymentToken: activeCard.token || `tok_${activeCard.brand.toLowerCase()}_sandbox`,
      last4: activeCard.last4,
      gatewayProvider: activeCard.brand === "PayHere" ? "PayHere-Sandbox" : "Stripe-Sandbox",
    });
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = addCard({
      type: "card",
      brand: quickCard.brand,
      name: quickCard.name.trim() || `${quickCard.brand} •••• ${quickCard.last4}`,
      last4: quickCard.last4,
      expiryMonth: Number(quickCard.expiryMonth),
      expiryYear: Number(quickCard.expiryYear),
      isDefault: true,
      holderName: userProfile?.fullName || "TEST CUSTOMER",
    });
    const createdItem = updated[updated.length - 1];
    if (createdItem) {
      setSelectedId(createdItem.id);
    }
    setShowQuickAdd(false);
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
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <CheckCircle2 size={40} color="var(--success)" />
          </div>

          <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
            Payment Successful!
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
            Settlement authorized via {activeCard?.brand || "Sandbox Card"} ({activeCard?.last4 || "4242"})
          </p>

          <div
            style={{
              background: "var(--bg-surface-elevated)",
              borderRadius: "12px",
              padding: "1.5rem",
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
              <span>{activeCard?.brand === "PayHere" ? "PayHere Sandbox" : "Stripe Sandbox (Polly Resilient)"}</span>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h2 className="payments-card-title" style={{ margin: 0 }}>
                <CreditCard size={20} color="var(--accent)" />
                Choose Sandbox Payment Card
              </h2>
              <Link
                to="/account/payment-methods"
                className="btn-secondary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <Sparkles size={14} color="var(--accent)" /> Manage Saved Cards
              </Link>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Synced with your saved payment vault. Select a card or add a new one.
            </p>

            {/* List of Synchronized Saved Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {methods.map((card) => {
                const isSelected = activeCard?.id === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedId(card.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1rem 1.25rem",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                      backgroundColor: isSelected ? "oklch(45% 0.2 260 / 0.05)" : "var(--bg-surface)",
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
                          border: isSelected ? "5px solid var(--accent)" : "2px solid var(--border)",
                          background: "#fff",
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-h)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {card.name || `${card.brand} •••• ${card.last4}`}
                          {card.isDefault && (
                            <span className="badge-status Succeeded" style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem" }}>
                              Default
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          •••• •••• •••• {card.last4}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                        Exp {String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {card.brand}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Card Toggle */}
            <div style={{ marginBottom: "1.5rem" }}>
              {!showQuickAdd ? (
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="btn-secondary btn-sm"
                  style={{ width: "100%", justifyContent: "center", gap: "0.4rem" }}
                >
                  <Plus size={15} /> Add Another Card to Vault
                </button>
              ) : (
                <form
                  onSubmit={handleQuickAdd}
                  style={{
                    background: "var(--bg-surface-elevated)",
                    padding: "1rem",
                    borderRadius: "10px",
                    border: "1px dashed var(--accent)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "0.85rem" }}>Add Card Directly to Vault</strong>
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(false)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      Cancel
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Brand</label>
                      <select
                        value={quickCard.brand}
                        onChange={(e) => setQuickCard({ ...quickCard, brand: e.target.value })}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-h)" }}
                      >
                        <option value="Visa">Visa</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="Amex">American Express</option>
                        <option value="PayHere">PayHere Demo</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Last 4</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={quickCard.last4}
                        onChange={(e) => setQuickCard({ ...quickCard, last4: e.target.value })}
                        required
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-h)" }}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary btn-sm">
                    Save to Vault & Select
                  </button>
                </form>
              )}
            </div>

            {/* Interactive Card Simulator Display */}
            <div className="card-simulator">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-simulator-chip" />
                <span style={{ fontWeight: 700, letterSpacing: "0.05em" }}>
                  {activeCard?.brand || "Visa"}
                </span>
              </div>
              <div className="card-simulator-number">
                {`•••• •••• •••• ${activeCard?.last4 || "4242"}`}
              </div>
              <div className="card-simulator-footer">
                <div>
                  <div style={{ fontSize: "0.6rem", opacity: 0.7 }}>Card Holder</div>
                  <div>{activeCard?.holderName || userProfile?.fullName || "TEST CUSTOMER"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.6rem", opacity: 0.7 }}>Expires</div>
                  <div>
                    {activeCard
                      ? `${String(activeCard.expiryMonth).padStart(2, "0")}/${String(activeCard.expiryYear).slice(-2)}`
                      : "12/28"}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={payMutation.isPending || !activeCard}
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
