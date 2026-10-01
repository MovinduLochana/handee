import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { usersApi } from "../../api/users";
import { Download, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProviderPayoutHistory() {
  const [filter, setFilter] = useState<string>("ALL");

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["providerPayouts", userProfile?.id],
    queryFn: () =>
      userProfile?.id ? paymentsApi.getProviderPayouts(userProfile.id) : Promise.resolve([]),
    enabled: !!userProfile?.id,
  });

  const filteredPayouts = payouts.filter((p) => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  const handleExportCsv = () => {
    const headers =
      "Payout Ref,Booking ID,Created Date,Gross (LKR),Platform Fee (LKR),Net Amount (LKR),Status\n";
    const rows = filteredPayouts
      .map(
        (p) =>
          `"${p.payoutReference || p.id}","${p.bookingId}","${new Date(p.createdAt).toISOString()}",${p.grossAmount},${p.platformFeeDeducted},${p.netAmount},"${p.status}"`,
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handee-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/provider/payouts"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Payout Ledger & History
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Comprehensive itemised record of all disbursements and platform fees
            </p>
          </div>
        </div>
        <Button
          onClick={handleExportCsv}
          variant="outline"
          disabled={filteredPayouts.length === 0}
          className="gap-2 shrink-0"
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-3 flex-wrap">
        {["ALL", "Pending", "Processing", "Completed", "Failed"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
            className="text-xs"
          >
            {status === "ALL" ? "All Payouts" : status}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            Loading ledger...
          </CardContent>
        ) : filteredPayouts.length === 0 ? (
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            No payouts matching current filter.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payout Ref</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Date Initiated</TableHead>
                  <TableHead>Customer Gross</TableHead>
                  <TableHead>15% Handee Fee</TableHead>
                  <TableHead>Net Deposited</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-bold text-foreground text-xs">
                      {p.payoutReference || `PAY-${p.id.slice(0, 8).toUpperCase()}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      #{p.bookingId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">LKR {p.grossAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      -LKR {p.platformFeeDeducted.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      LKR {p.netAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {p.status}
                      </Badge>
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
