import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Plus,
  Trash2,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { usersApi } from "../../api/users";
import { usePaymentMethods } from "../../lib/paymentMethodsStore";
import "./Payments.css";

export default function PaymentMethods() {
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const { methods, addCard, removeCard, setCardDefault } = usePaymentMethods(
    userProfile?.id,
    userProfile?.fullName || "TEST CUSTOMER",
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({
    name: "Personal Card",
    holderName: userProfile?.fullName || "Kasun Perera",
    brand: "Visa",
    last4: "9999",
    expiryMonth: 10,
    expiryYear: 2029,
    isDefault: false,
  });

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    addCard({
      type: "card",
      brand: newCard.brand,
      name: newCard.name.trim() || `${newCard.brand} •••• ${newCard.last4}`,
      last4: newCard.last4,
      expiryMonth: Number(newCard.expiryMonth),
      expiryYear: Number(newCard.expiryYear),
      isDefault: newCard.isDefault || methods.length === 0,
      holderName: newCard.holderName.trim() || userProfile?.fullName || "Cardholder",
    });
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
              Manage your sandbox payment cards and digital wallets — seamlessly synced with
              checkout
            </p>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setNewCard((prev) => ({
              ...prev,
              holderName: userProfile?.fullName || prev.holderName,
            }));
            setShowAddForm(true);
          }}
        >
          <Plus size={16} /> Add Payment Method
        </button>
      </div>

      {/* Sync Status Banner */}
      <div
        className="payments-card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          background: "oklch(45% 0.2 260 / 0.05)",
          border: "1px solid var(--accent)",
        }}
      >
        <Sparkles size={22} color="var(--accent)" />
        <div style={{ fontSize: "0.88rem", color: "var(--text)" }}>
          <strong style={{ color: "var(--text-h)" }}>Live Checkout Sync:</strong> All cards in this
          vault automatically appear on the Secure Checkout screen for instant settlement.
          {userProfile && (
            <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)" }}>
              Vault attached to <strong>{userProfile.fullName || userProfile.email}</strong>
            </span>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="payments-card" style={{ maxWidth: 580, margin: "0 0 2rem" }}>
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
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={newCard.holderName}
                  onChange={(e) => setNewCard({ ...newCard, holderName: e.target.value })}
                  placeholder="Cardholder Name"
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
                  Card Label / Nickname
                </label>
                <input
                  type="text"
                  value={newCard.name}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                  placeholder="e.g. Primary Visa"
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

            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}
            >
              <input
                type="checkbox"
                id="isDefaultCheckbox"
                checked={newCard.isDefault}
                onChange={(e) => setNewCard({ ...newCard, isDefault: e.target.checked })}
              />
              <label
                htmlFor="isDefaultCheckbox"
                style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--text)" }}
              >
                Set as default payment card for checkout
              </label>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem" }}>
              Save Sandbox Method
            </button>
          </form>
        </div>
      )}

      {methods.length === 0 ? (
        <div className="payments-card" style={{ textAlign: "center", padding: "3rem" }}>
          <CreditCard size={48} color="var(--text-muted)" style={{ margin: "0 auto 1rem" }} />
          <h3>No Payment Methods Saved</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Add a sandbox test card to complete settlements quickly.
          </p>
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> Add Test Card
          </button>
        </div>
      ) : (
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
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className="stat-icon-wrapper blue" style={{ width: 44, height: 44 }}>
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-h)" }}>
                      {method.name || `${method.brand} Card`}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      •••• •••• •••• {method.last4}
                    </div>
                  </div>
                </div>
                {method.isDefault ? (
                  <span
                    className="badge-status Succeeded"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    <CheckCircle2 size={12} /> Default
                  </span>
                ) : (
                  <button
                    onClick={() => setCardDefault(method.id)}
                    className="btn-secondary btn-sm"
                  >
                    Make Default
                  </button>
                )}
              </div>

              <div
                style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}
              >
                <span>Holder: </span>
                <strong style={{ color: "var(--text)" }}>
                  {method.holderName || "TEST CUSTOMER"}
                </strong>
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
                  Expires {String(method.expiryMonth).padStart(2, "0")}/{method.expiryYear}
                </span>
                <button
                  onClick={() => removeCard(method.id)}
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
      )}

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
          <strong style={{ color: "var(--text-h)" }}>Sandbox Security Vault:</strong> All card
          details are stored in simulated vault storage for grading and testing. No actual financial
          charges are incurred.
        </div>
      </div>
    </div>
  );
}
