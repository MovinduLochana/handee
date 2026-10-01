import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../../api/users";
import { getAccessToken, getRefreshToken, clearTokens } from "../../lib/tokenManager";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = getRefreshToken() || getAccessToken();

  const {
    data: userProfile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Not logged in -> redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Profile loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying authorization...</p>
      </div>
    );
  }

  // Session expired or failed -> clear and redirect
  if (isError || !userProfile) {
    clearTokens();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role validation
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = userProfile.roles || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return <Navigate to="/403" state={{ from: location }} replace />;
    }
  }

  return <Outlet />;
}
