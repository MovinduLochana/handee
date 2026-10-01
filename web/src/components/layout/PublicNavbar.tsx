import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRefreshToken } from "../../lib/tokenManager";
import { usersApi } from "../../api/users";
import { authApi } from "../../api/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <nav className="public-nav-bar flex justify-between items-center px-8 py-5 border-b border-border bg-background text-foreground">
      <Link
        to="/"
        className="brand text-2xl font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity"
      >
        Handee
      </Link>
      <div className="nav-actions flex items-center gap-4">
        {isLoggedIn ? (
          <div className="flex items-center gap-3 flex-wrap">
            {userProfile && (
              <div className="flex items-center gap-3 mr-2 animate-fade-up">
                <div className="text-right flex flex-col gap-0.5 mr-1">
                  <div className="font-semibold text-sm text-foreground">
                    {userProfile.fullName}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    {userProfile.roles?.[0] || "Member"}
                  </div>
                </div>
                <Avatar className="h-9 w-9 border border-border">
                  {userProfile.profilePictureUrl && (
                    <AvatarImage
                      src={getFullMediaUrl(userProfile.profilePictureUrl)}
                      alt={userProfile.fullName}
                    />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                    {userProfile.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}

            <Button asChild variant="default" size="sm">
              <Link to="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/register/provider">Join as a Pro</Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link to="/login" className="login-link">
                Sign In
              </Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
