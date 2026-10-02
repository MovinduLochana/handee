import { useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Bell,
  Settings,
  Activity,
  LogOut,
  CheckSquare,
  Star,
  Users,
  UserCircle,
  Package,
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  Receipt,
  DollarSign,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { authApi } from "../../api/auth";
import { usersApi } from "../../api/users";
import { providerApi } from "../../api/providers";
import { getRefreshToken } from "../../lib/tokenManager";
import { getFullMediaUrl } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AiAssistantWidget from "../ai/AiAssistantWidget";

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
    retry: false,
  });

  // Dynamic Navigation based on roles
  const roles = userProfile?.roles || [];
  const isAdmin = roles.includes("Admin");
  const isProvider = roles.includes("Provider");
  const isCustomer = !!userProfile && !isProvider && !isAdmin;

  const { data: myProviderProfile } = useQuery({
    queryKey: ["myProfile"],
    queryFn: providerApi.getMyProfile,
    enabled: isProvider,
    retry: false,
  });

  useEffect(() => {
    if (isProvider && myProviderProfile) {
      if (!myProviderProfile.headline && location.pathname !== "/provider/onboarding") {
        navigate("/provider/onboarding", { replace: true });
      }
    }
  }, [isProvider, myProviderProfile, navigate, location.pathname]);

  const navigation = [
    { name: "Dashboard", to: "/dashboard", icon: Home, show: true },
    { name: "Notifications", to: "/notifications", icon: Bell, show: true },
    { name: "Invoices", to: "/invoices", icon: Receipt, show: !isAdmin },

    // Admin
    { name: "Agent Workflow", to: "/admin/agent-workflow", icon: Activity, show: isAdmin },
    { name: "Verifications", to: "/admin/verifications", icon: CheckSquare, show: isAdmin },
    { name: "Users Directory", to: "/admin/users", icon: Users, show: isAdmin },
    { name: "Provider Directory", to: "/admin/providers", icon: Briefcase, show: isAdmin },
    {
      name: "Booking Overview",
      to: "/admin/booking-overview",
      icon: LayoutDashboard,
      show: isAdmin,
    },
    { name: "Job Requests", to: "/admin/job-requests", icon: ClipboardList, show: isAdmin },
    { name: "Bookings", to: "/admin/bookings", icon: CalendarCheck, show: isAdmin },
    { name: "Payments & Payouts", to: "/admin/payments", icon: CreditCard, show: isAdmin },

    // Provider
    { name: "Verification Status", to: "/provider/status", icon: CheckSquare, show: isProvider },
    { name: "My Profile", to: "/provider/profile", icon: UserCircle, show: isProvider },
    { name: "Service Listings", to: "/provider/service-listings", icon: Package, show: isProvider },
    {
      name: "Bookings & Inquiries",
      to: "/provider/bookings",
      icon: CalendarCheck,
      show: isProvider,
    },
    { name: "My Reviews", to: "/provider/reviews", icon: Star, show: isProvider },
    { name: "Payouts & Earnings", to: "/provider/payouts", icon: DollarSign, show: isProvider },

    { name: "Settings", to: "/account", icon: Settings, show: true },
  ].filter((item) => item.show);

  const logoutMutation = useMutation({
    mutationFn: () => {
      const token = getRefreshToken();
      if (!token) return Promise.resolve();
      return authApi.logout(token);
    },
    onSettled: () => {
      queryClient.clear();
      navigate("/login");
    },
  });

  return (
    <div className="shell-container flex h-screen w-screen max-w-full bg-background text-foreground">
      <aside className="shell-sidebar w-62.5 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col p-6 max-md:w-screen max-md:h-auto max-md:flex-row max-md:fixed max-md:bottom-0 max-md:left-0 max-md:z-50 max-md:p-2 max-md:border-t">
        <div className="brand text-2xl font-bold tracking-tight mb-8 pl-4 max-md:hidden">
          Handee
        </div>
        <nav className="shell-nav flex flex-col gap-1 max-md:flex-row max-md:w-full max-md:justify-around">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/70"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="nav-text">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="shell-main flex-1 flex flex-col overflow-hidden max-md:pb-20">
        <header className="shell-header h-16 border-b border-border flex items-center justify-end px-6 bg-background">
          <div className="flex-1 flex justify-end items-center mr-6 gap-3">
            {userProfile && (
              <div className="flex items-center gap-3 animate-fade-up">
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
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-2 text-sm"
          >
            <LogOut className="h-4 w-4" />
            {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </header>
        <main className="shell-content flex-1 overflow-y-auto p-6 bg-muted/20">
          <Outlet />
        </main>
      </div>
      {isCustomer && <AiAssistantWidget />}
    </div>
  );
}
