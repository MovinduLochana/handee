import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardHome() {
  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground text-sm">
          Welcome back to Handee. Here's a quick summary of your operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Stat Card */}
        <Card className="bg-card text-card-foreground border-border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-foreground">2</div>
          </CardContent>
        </Card>

        {/* Call to Action Stat Card */}
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

        {/* Subtle Stat Card */}
        <Card className="bg-card text-card-foreground border-border shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earned (All time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-foreground">0</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
