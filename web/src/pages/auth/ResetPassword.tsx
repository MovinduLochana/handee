import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../../api/auth";
import { extractApiError } from "../../lib/api";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import "./Auth.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [authError, setAuthError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      setIsSuccess(true);
      setAuthError("");
    },
    onError: (error: any) => {
      setAuthError(extractApiError(error, "Password reset failed."));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);

    resetPasswordMutation.mutate({
      email: email || "",
      token: token || "",
      newPassword: formData.get("password") as string,
    });
  };

  if (!token || !email) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="brand">Handee</div>
          <h2>Invalid link</h2>
          <p className="subtitle">This password reset link is invalid or has expired.</p>
          <div className="auth-links" style={{ marginTop: "1.5rem", justifyContent: "center" }}>
            <Link to="/forgot-password" style={{ fontWeight: 600 }}>
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="brand">Handee</div>
          <h2>Password Reset</h2>
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
          <p className="subtitle">Your password has been successfully reset.</p>
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
            Log in to your account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand">Handee</div>
        <h2>Create new password</h2>
        <p className="subtitle">Enter a new password for {email}.</p>

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
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              disabled={resetPasswordMutation.isPending}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={resetPasswordMutation.isPending}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {resetPasswordMutation.isPending ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
