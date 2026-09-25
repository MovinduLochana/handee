import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../../api/auth";
import { usersApi } from "../../api/users";
import { extractApiError } from "../../lib/api";
import { Loader2, AlertCircle } from "lucide-react";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState("");

  const loginMutation = useMutation({
    mutationFn: (credentials: any) => authApi.login(credentials),
    onSuccess: async () => {
      try {
        // Fetch profile to determine role
        const profile = await usersApi.getProfile();
        if (profile.roles.includes("Customer")) {
          navigate("/providers");
        } else {
          navigate("/dashboard");
        }
      } catch {
        // Fallback if profile fetch fails
        navigate("/dashboard");
      }
    },
    onError: (error: any) => {
      setAuthError(extractApiError(error, "Invalid credentials."));
    },
  });

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);
    loginMutation.mutate({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand">Handee</div>
        <h2>Welcome back</h2>
        <p className="subtitle">Enter your credentials to access your account</p>

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

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="name@example.com"
              required
              disabled={loginMutation.isPending}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              disabled={loginMutation.isPending}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loginMutation.isPending}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <div style={{ marginTop: "1rem" }}>
            Don't have an account? <Link to="/register/customer">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
