import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Plus, Trash2, ShieldCheck, ArrowLeft } from "lucide-react";
import type { PaymentMethodItem } from "../../api/payments";
import "./Payments.css";

const INITIAL_METHODS: PaymentMethodItem[] = [
  {
    id: "pm_1",
    type: "card",
    brand: "Visa",
    last4: "4242",
    expiryMonth: 12,
    expiryYear: 2028,
    isDefault: true,
  },
  {
    id: "pm_2",
    type: "card",
    brand: "Mastercard",
    last4: "5555",
    expiryMonth: 8,
    expiryYear: 2029,
    isDefault: false,
  },
];

export default function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethodItem[]>(INITIAL_METHODS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({
    brand: "Visa",
    last4: "9999",
    expiryMonth: 10,
    expiryYear: 2029,
  });

  const handleSetDefault = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id,
      })),
    );
  };

  const handleDelete = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const created: PaymentMethodItem = {
      id: `pm_${Date.now()}`,
      type: "card",
      brand: newCard.brand,
      last4: newCard.last4,
      expiryMonth: Number(newCard.expiryMonth),
      expiryYear: Number(newCard.expiryYear),
      isDefault: methods.length === 0,
    };
    setMethods((prev) => [...prev, created]);
    setShowAddForm(false);
  };

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/invoices" className="btn-secondary btn-sm">
            <ArrowLeft size={16} /> Invoices
          </Link>
          <div>
            <h1 className="payments-title">Saved Payment Methods</h1>
            <p className="payments-subtitle">
              Manage your sandbox payment cards and digital wallets
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> Add Payment Method
        </button>
      </div>

      {showAddForm && (
        <div className="payments-card" style={{ maxWidth: 540, margin: "0 0 2rem" }}>
          <div className="payments-card-header">
            <h3 className="payments-card-title">
              <CreditCard size={18} /> Add Sandbox Card
            </h3>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary btn-sm">
              Cancel
            </button>
          </div>

          <form
            onSubmit={handleAddCard}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.3rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Card Brand
                </label>
                <select
                  value={newCard.brand}
                  onChange={(e) => setNewCard({ ...newCard, brand: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-h)",
                  }}
                >
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Amex">American Express</option>
                  <option value="PayHere">PayHere Demo</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.3rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Last 4 Digits
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={newCard.last4}
                  onChange={(e) => setNewCard({ ...newCard, last4: e.target.value })}
                  placeholder="4242"
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-h)",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.3rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Expiry Month
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={newCard.expiryMonth}
                  onChange={(e) => setNewCard({ ...newCard, expiryMonth: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-h)",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.3rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Expiry Year
                </label>
                <input
                  type="number"
                  min={2026}
                  max={2035}
                  value={newCard.expiryYear}
                  onChange={(e) => setNewCard({ ...newCard, expiryYear: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-h)",
                  }}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem" }}>
              Save Sandbox Method
            </button>
          </form>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {methods.map((method) => (
          <div
            key={method.id}
            className="payments-card"
            style={{
              position: "relative",
              border: method.isDefault ? "2px solid var(--accent)" : "1px solid var(--border)",
              marginBottom: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="stat-icon-wrapper blue" style={{ width: 44, height: 44 }}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-h)" }}>{method.brand}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    •••• •••• •••• {method.last4}
                  </div>
                </div>
              </div>
              {method.isDefault ? (
                <span className="badge-status Succeeded">Default</span>
              ) : (
                <button
                  onClick={() => handleSetDefault(method.id)}
                  className="btn-secondary btn-sm"
                >
                  Make Default
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border)",
              }}
            >
              <span>
                Expires {method.expiryMonth}/{method.expiryYear}
              </span>
              <button
                onClick={() => handleDelete(method.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-danger)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.8rem",
                }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        className="payments-card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          backgroundColor: "var(--bg-surface-elevated)",
        }}
      >
        <ShieldCheck size={28} color="var(--accent)" />
        <div style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text-h)" }}>Sandbox Security:</strong> All card details are
          stored in simulated vault storage for grading and testing. No actual financial charges are
          incurred.
        </div>
      </div>
    </div>
  );
}
