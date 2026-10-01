import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { usersApi } from "../../api/users";
import { FileText, CreditCard, Eye, Receipt, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InvoicesList() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const isProvider = userProfile?.roles?.includes("Provider");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", userProfile?.id, isProvider],
    queryFn: () => {
      if (!userProfile?.id) return Promise.resolve([]);
      if (isProvider) {
        return paymentsApi.getProviderInvoices(userProfile.id);
      }
      return paymentsApi.getCustomerInvoices(userProfile.id);
    },
    enabled: !!userProfile?.id,
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === "ALL") return true;
    return inv.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 font-semibold"
          >
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </Badge>
        );
      case "Issued":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 font-semibold"
          >
            <Clock className="h-3 w-3" />
            Issued
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive gap-1 font-semibold"
          >
            Cancelled
          </Badge>
        );
      case "Refunded":
        return (
          <Badge
            variant="outline"
            className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 gap-1 font-semibold"
          >
            Refunded
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-semibold">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {isProvider ? "Job Invoices & Billings" : "My Invoices"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isProvider
              ? "Track customer invoices, payment settlements, and itemized receipts for your services"
              : "Manage your service receipts, payment records, and outstanding bills"}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {isProvider ? (
            <Link to="/provider/payouts" className={buttonVariants({ variant: "outline" })}>
              <Receipt className="h-4 w-4" /> Payouts & Earnings Dashboard{" "}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link to="/account/payment-methods" className={buttonVariants({ variant: "outline" })}>
              <CreditCard className="h-4 w-4" /> Saved Payment Methods
            </Link>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-3 flex-wrap">
        {["ALL", "Issued", "Paid", "Cancelled", "Refunded"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className="text-xs font-semibold"
          >
            {status === "ALL" ? "All Invoices" : status}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="text-center p-12 text-muted-foreground">
            <p>Loading invoices...</p>
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 px-6 flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Receipt className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No invoices found</h3>
            <p className="text-muted-foreground max-w-md text-sm">
              {statusFilter === "ALL"
                ? isProvider
                  ? "Invoices generated for your completed or in-progress jobs will be listed here automatically."
                  : "When you complete or accept quotes for bookings, your itemised invoices will appear here."
                : `No invoices currently marked as "${statusFilter}".`}
            </p>
            <Link
              to={isProvider ? "/provider/payouts" : "/dashboard"}
              className={buttonVariants({ variant: "default" })}
            >
              {isProvider ? "View Payouts & Earnings" : "Explore Services"}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>{isProvider ? "Customer" : "Booking"}</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>{isProvider ? "Trade Amount (85%)" : "Base Rate"}</TableHead>
                  <TableHead>Platform Fee (15%)</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-bold font-mono text-foreground text-xs">
                          INV-{inv.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {isProvider ? (
                          <>
                            <div className="font-semibold text-foreground text-sm">
                              {inv.customerName || "Customer"}
                            </div>
                            <span className="text-muted-foreground text-xs">
                              Booking #{inv.bookingId.slice(0, 8)}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs font-mono">
                            #{inv.bookingId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(inv.issuedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      LKR {inv.baseAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      LKR {inv.platformFee.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-bold text-foreground text-sm">
                      LKR {inv.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />{" "}
                          {inv.status === "Paid" ? "View Receipt" : "View"}
                        </Link>
                        {!isProvider && inv.status === "Issued" && (
                          <Link
                            to={`/invoices/${inv.id}/pay`}
                            className={buttonVariants({ variant: "default", size: "sm" })}
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay Now
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
