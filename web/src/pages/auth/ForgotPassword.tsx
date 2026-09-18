import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../../api/auth";
import { extractApiError } from "../../lib/api";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import "./Auth.css";

export default function ForgotPassword() {
  const [authError, setAuthError] = useState("");
  const [isSent, setIsSent] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      setIsSent(true);
      setAuthError("");
    },
    onError: (error: any) => {
      setAuthError(extractApiError(error, "Failed to process request."));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);
    forgotPasswordMutation.mutate(formData.get("email") as string);
  };

  if (isSent) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="brand">Handee</div>
          <h2>Check your inbox</h2>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              margin: "1.5rem 0",
              color: "var(--success)",
            }}
          >
            <CheckCircle2 size={56} strokeWidth={1.5} />
          </div>
          <p className="subtitle">
            If an account exists for that email, we've sent a password reset link.
          </p>
          {/* Fixed box-sizing bleeding bug */}
          <Link
            to="/login"
            className="btn-primary"
            style={{
              display: "flex",
              justifyContent: "center",
              boxSizing: "border-box",
              marginTop: "2rem",
              textDecoration: "none",
            }}
          >
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand">Handee</div>
        <h2>Reset your password</h2>
        <p className="subtitle">Enter your email address to receive a recovery link.</p>

        {authError && (
          <div
            style={{
              backgroundColor: "var(--bg-danger)",
              color: "var(--text-danger)",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
            className="animate-fade-up"
          >
            <AlertCircle size={20} />
            <div>{authError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="name@example.com"
              required
              disabled={forgotPasswordMutation.isPending}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={forgotPasswordMutation.isPending}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {forgotPasswordMutation.isPending ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <div className="auth-links">
          <div>
            Remember your password? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
