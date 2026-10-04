import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { usersApi } from "../../api/users";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProviderPayoutDashboard() {
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const { data: summary } = useQuery({
    queryKey: ["providerSummary", userProfile?.id],
    queryFn: () =>
      userProfile?.id
        ? paymentsApi.getProviderEarningsSummary(userProfile.id)
        : Promise.resolve(null),
    enabled: !!userProfile?.id,
  });

  const { data: payouts = [], isLoading: isPayoutsLoading } = useQuery({
    queryKey: ["providerPayouts", userProfile?.id],
    queryFn: () =>
      userProfile?.id ? paymentsApi.getProviderPayouts(userProfile.id) : Promise.resolve([]),
    enabled: !!userProfile?.id,
  });

  const totalEarnings = summary?.totalEarnings ?? 0;
  const availableBalance = summary?.availableBalance ?? 0;
  const pendingPayouts = summary?.pendingPayouts ?? 0;
  const completedJobs = summary?.completedJobsCount ?? 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Earnings & Payouts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track your net earnings, clearances, and automated bank deposits
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Link to="/invoices" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Receipt className="h-4 w-4 mr-1.5" /> Job Invoices & Receipts
          </Link>
          <Link
            to="/provider/payouts/history"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Full Payout History
          </Link>
        </div>
      </div>

      {/* Financial Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Total Net Earnings
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              LKR {totalEarnings.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Available for Payout
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground font-mono">
              LKR {availableBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Pending Settlement
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              LKR {pendingPayouts.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Paid Bookings
              <Briefcase className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{completedJobs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Model Callout */}
      <Card className="bg-muted/40 border-border">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <ShieldCheck className="h-9 w-9 text-primary shrink-0" />
            <div>
              <h3 className="font-bold text-foreground text-sm">85% Net Provider Revenue Share</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Handee charges a transparent 15% platform commission on customer totals. Every
                verified booking automatically deposits 85% directly to your payout ledger.
              </p>
            </div>
          </div>
          <Link
            to="/provider/payouts/history"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            View Ledger <ArrowRight className="h-4 w-4 ml-1.5" />
          </Link>
        </CardContent>
      </Card>

      {/* Recent Payouts Table */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Recent Payout Activity
          </CardTitle>
          <Link
            to="/provider/payouts/history"
            className="text-xs text-primary hover:underline font-semibold"
          >
            View All ({payouts.length})
          </Link>
        </CardHeader>

        {isPayoutsLoading ? (
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            Loading payouts...
          </CardContent>
        ) : payouts.length === 0 ? (
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            No payout transactions recorded yet. Complete customer jobs to begin earning.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payout Ref</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Gross Charged</TableHead>
                  <TableHead>15% Platform Fee</TableHead>
                  <TableHead>Net Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.slice(0, 5).map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-mono font-semibold text-xs">
                      {payout.payoutReference || `PAY-${payout.id.slice(0, 8).toUpperCase()}`}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      #{payout.bookingId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      LKR {payout.grossAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      -LKR {payout.platformFeeDeducted.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      LKR {payout.netAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to="/invoices"
                        className={buttonVariants({ variant: "outline", size: "xs" })}
                      >
                        <Receipt className="h-3 w-3 mr-1" /> View Invoice
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
