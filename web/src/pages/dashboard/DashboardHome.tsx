import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../../api/users";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardHome() {
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
    retry: false,
  });

  const roles = userProfile?.roles || [];
  const isAdmin = roles.includes("Admin");
  const isProvider = roles.includes("Provider");

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground text-sm">
          Welcome back{userProfile?.fullName ? `, ${userProfile.fullName}` : ""}. Here's a quick
          summary of your operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Active Bookings */}
        <Link
          to={isAdmin ? "/admin/bookings" : isProvider ? "/dashboard" : "/invoices"}
          className="block group"
        >
          <Card className="bg-card text-card-foreground border-border shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-foreground mb-2">2</div>
              <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                {isAdmin ? "Manage Bookings" : isProvider ? "View Active Work" : "View Bookings"}{" "}
                <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Role-based Action Card */}
        {isAdmin && (
          <Link to="/admin/agent-workflow" className="block group">
            <Card className="bg-primary text-primary-foreground border-primary shadow-md hover:shadow-lg transition-all relative overflow-hidden">
              <div className="absolute top-5 right-5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-foreground"></span>
                </span>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black text-primary-foreground mb-4">1</div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/90 group-hover:translate-x-1 transition-transform">
                  Review Workflow <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {isProvider && !isAdmin && (
          <Link to="/provider/status" className="block group">
            <Card className="bg-primary text-primary-foreground border-primary shadow-md hover:shadow-lg transition-all relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">
                  Verification Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-primary-foreground/90 mb-4">
                  Check status of your trade credentials and review notes
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/90 group-hover:translate-x-1 transition-transform">
                  Check Status <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {!isAdmin && !isProvider && (
          <Link to="/providers" className="block group">
            <Card className="bg-primary text-primary-foreground border-primary shadow-md hover:shadow-lg transition-all relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">
                  Find Professionals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-primary-foreground/90 mb-4">
                  Connect with verified tradespeople across Sri Lanka
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/90 group-hover:translate-x-1 transition-transform">
                  Browse Providers <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Card 3: Role-based Finance / Settings */}
        {isAdmin && (
          <Link to="/admin/payments" className="block group">
            <Card className="bg-card text-card-foreground border-border shadow-xs hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Disbursements & Payouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-muted-foreground mb-4">
                  Review provider payout requests and platform ledger
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  Manage Finances <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {isProvider && !isAdmin && (
          <Link to="/provider/payouts" className="block group">
            <Card className="bg-card text-card-foreground border-border shadow-xs hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Earned (All time)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black text-foreground mb-4">0</div>
                <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  View Payouts <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {!isAdmin && !isProvider && (
          <Link to="/invoices" className="block group">
            <Card className="bg-card text-card-foreground border-border shadow-xs hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Invoices & Quotes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-muted-foreground mb-4">
                  View active quotes, bills, and payment history
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  View Invoices <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
