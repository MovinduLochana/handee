import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { DollarSign, TrendingUp, CreditCard, Clock, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminPaymentsOverview() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");

  const {
    data: overview,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["adminPaymentsOverview"],
    queryFn: paymentsApi.getAdminPayoutsOverview,
  });

  const processMutation = useMutation({
    mutationFn: (payoutId: string) => paymentsApi.processPayout(payoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPaymentsOverview"] });
    },
  });

  const recentPayouts = overview?.recentPayouts || [];
  const filteredPayouts = recentPayouts.filter((p) => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs"
          >
            Completed
          </Badge>
        );
      case "Pending":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs"
          >
            Pending
          </Badge>
        );
      case "Processing":
        return (
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-xs"
          >
            Processing
          </Badge>
        );
      case "Withdrawn":
        return (
          <Badge
            variant="outline"
            className="border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold text-xs"
          >
            Withdrawn
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-semibold text-xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary gap-1 text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Financial Audit & Reconciliation
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Platform Payments & Disbursements
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Admin oversight for payment processing, platform commissions (15%), and provider payouts
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2 shrink-0">
          <RefreshCw className="h-4 w-4" /> Refresh Metrics
        </Button>
      </div>

      {/* Platform Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Gross Volume
              <DollarSign className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground font-mono">
              LKR {(overview?.totalGrossVolume ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Platform Fees (15%)
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              LKR {(overview?.totalPlatformFees ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Disbursed (85%)
              <CreditCard className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
              LKR {(overview?.totalPaidOut ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Pending Payouts
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {overview?.pendingPayoutCount ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Processing Queue */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Disbursement Queue & Settlement
          </CardTitle>
          <div className="flex gap-1.5 flex-wrap">
            {["ALL", "Pending", "Completed", "Withdrawn"].map((st) => (
              <Button
                key={st}
                variant={filter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(st)}
                className="text-xs h-7"
              >
                {st}
              </Button>
            ))}
          </div>
        </CardHeader>

        {isLoading ? (
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            Loading settlement data...
          </CardContent>
        ) : filteredPayouts.length === 0 ? (
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            No disbursements recorded in the platform ledger.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payout ID</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Gross Charged</TableHead>
                  <TableHead>15% Platform Commission</TableHead>
                  <TableHead>Net Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-mono font-semibold text-xs">
                      {payout.payoutReference || `PAY-${payout.id.slice(0, 8).toUpperCase()}`}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground text-sm">
                        {payout.providerName || "Service Provider"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        ID: {payout.providerId.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      #{payout.bookingId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs">
                      LKR {payout.grossAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-primary">
                      +LKR {payout.platformFeeDeducted.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      LKR {payout.netAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                    <TableCell className="text-right">
                      {payout.status === "Pending" ? (
                        <Button
                          size="sm"
                          onClick={() => processMutation.mutate(payout.id)}
                          disabled={processMutation.isPending}
                          className="h-7 text-xs"
                        >
                          {processMutation.isPending ? "Disbursing..." : "Approve & Settle"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Settled</span>
                      )}
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
