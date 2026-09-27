import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRefreshToken } from "../../lib/tokenManager";
import { usersApi } from "../../api/users";
import { authApi } from "../../api/auth";
import { getFullMediaUrl } from "../../lib/api";
import "./PublicNavbar.css";

export default function PublicNavbar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getRefreshToken();
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
    enabled: isLoggedIn,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => {
      const token = getRefreshToken();
      if (!token) return Promise.resolve();
      return authApi.logout(token);
    },
    onSettled: () => {
      queryClient.clear();
      setIsLoggedIn(false);
      navigate("/login");
    },
  });

  return (
    <nav className="public-nav-bar">
      <Link to="/" className="brand">
        Handee
      </Link>
      <div className="nav-actions">
        {isLoggedIn ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {userProfile && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginRight: "0.5rem",
                }}
                className="animate-fade-up"
              >
                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    marginRight: "0.25rem",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-h)" }}>
                    {userProfile.fullName}
                  </div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                    }}
                  >
                    {userProfile.roles?.[0] || "Member"}
                  </div>
                </div>
                {userProfile.profilePictureUrl ? (
                  <img
                    src={getFullMediaUrl(userProfile.profilePictureUrl)}
                    alt="Avatar"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "1px solid var(--border)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: "var(--accent)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {userProfile.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}

            <Link
              to="/dashboard"
              className="login-link"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <LayoutDashboard size={18} /> Dashboard
            </Link>

            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-h)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                cursor: logoutMutation.isPending ? "default" : "pointer",
                fontSize: "0.9rem",
                fontWeight: 600,
                transition: "all 0.2s var(--ease-spring)",
                opacity: logoutMutation.isPending ? 0.6 : 1,
              }}
              className="hover-lift"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <>
            <Link to="/register/provider">Join as a Pro</Link>
            <Link to="/login" className="login-link">
              Sign In
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
