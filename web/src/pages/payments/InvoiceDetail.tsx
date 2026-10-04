import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { Printer, CreditCard, ArrowLeft, ShieldCheck, CheckCircle } from "lucide-react";
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

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => paymentsApi.getInvoiceById(id || ""),
    enabled: !!id,
  });

  const { data: payment } = useQuery({
    queryKey: ["invoicePayment", id],
    queryFn: () => paymentsApi.getPaymentByInvoiceId(id || ""),
    enabled: !!id && invoice?.status === "Paid",
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="text-center p-12 text-muted-foreground">
            <p>Loading invoice details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="text-center p-12 space-y-4">
            <h2 className="text-xl font-bold text-foreground">Invoice Not Found</h2>
            <p className="text-muted-foreground text-sm">
              The requested invoice could not be located or you may not have access to view it.
            </p>
            <Link to="/invoices" className={buttonVariants({ variant: "outline" })}>
              Return to Invoices
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsedItems: Array<{ item: string; price: number; type?: string }> = invoice.lineItemsJson
    ? (() => {
        try {
          const val = JSON.parse(invoice.lineItemsJson);
          return Array.isArray(val) ? val : [{ item: "Service Work", price: invoice.baseAmount }];
        } catch {
          return [{ item: "Completed Service", price: invoice.baseAmount }];
        }
      })()
    : [
        {
          item: "On-site Service Labor",
          price: Math.round(invoice.baseAmount * 0.7),
          type: "Labor",
        },
        {
          item: "Standard Consumables / Parts",
          price: Math.round(invoice.baseAmount * 0.3),
          type: "Materials",
        },
      ];

  const getStatusBadge = (status: string) => {
    if (status === "Paid") {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 font-bold text-sm px-3 py-1"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          PAID
        </Badge>
      );
    }
    if (status === "Issued") {
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-sm px-3 py-1"
        >
          ISSUED
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-bold text-sm px-3 py-1 uppercase">
        {status}
      </Badge>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Invoice INV-{invoice.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Issued on {new Date(invoice.issuedAt).toLocaleDateString()} • Booking #
              {invoice.bookingId.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
          {invoice.status === "Issued" && (
            <Link
              to={`/invoices/${invoice.id}/pay`}
              className={buttonVariants({ variant: "default" })}
            >
              <CreditCard className="h-4 w-4 mr-1.5" /> Pay LKR{" "}
              {invoice.totalAmount.toLocaleString()}
            </Link>
          )}
        </div>
      </div>

      {/* Invoice Document Card */}
      <Card className="p-8 space-y-8 bg-card border border-border print:border-none print:shadow-none print:p-0">
        <div className="flex justify-between items-start border-b border-border pb-6">
          <div>
            <div className="text-2xl font-extrabold tracking-tight text-primary">Handee</div>
            <div className="text-xs text-muted-foreground mt-1">
              Secure On-Demand Service Marketplace
            </div>
            <div className="text-xs text-muted-foreground">Tax / Platform Reg: LK-HD-2026-PAY</div>
          </div>
          <div className="text-right space-y-1">
            <div>{getStatusBadge(invoice.status)}</div>
            <div className="text-xs text-muted-foreground">
              Currency: <strong className="text-foreground">{invoice.currency}</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Bill To Customer
            </div>
            <div className="font-bold text-foreground text-base mt-1">
              {invoice.customerName || "Valued Customer"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">
              ID: {invoice.customerId.slice(0, 8)}...
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Service Provider
            </div>
            <div className="font-bold text-foreground text-base mt-1">
              {invoice.providerName || "Verified Service Professional"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">
              ID: {invoice.providerId.slice(0, 8)}...
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Payment Date
            </div>
            <div className="font-semibold text-foreground mt-1 text-sm">
              {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : "Awaiting Settlement"}
            </div>
            {payment && (
              <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                Ref: {payment.transactionReference}
              </div>
            )}
          </div>
        </div>

        <div className="border border-border rounded overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Line Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount ({invoice.currency})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedItems.map((item, idx) => {
                const isUrgency =
                  item.type?.toLowerCase() === "urgency" ||
                  item.item.toLowerCase().includes("priority") ||
                  item.item.toLowerCase().includes("surcharge");
                return (
                  <TableRow
                    key={idx}
                    className={isUrgency ? "bg-amber-500/5 font-medium" : undefined}
                  >
                    <TableCell
                      className={`text-sm ${isUrgency ? "text-amber-600 dark:text-amber-400 font-bold" : "font-medium"}`}
                    >
                      {item.item}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isUrgency ? "default" : "secondary"}
                        className={
                          isUrgency
                            ? "bg-amber-500 hover:bg-amber-600 text-white text-xs"
                            : "text-xs"
                        }
                      >
                        {item.type || (isUrgency ? "Priority" : "Service Work")}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm ${isUrgency ? "text-amber-600 dark:text-amber-400 font-bold" : "font-semibold"}`}
                    >
                      {isUrgency && item.price > 0 ? "+" : ""}
                      {item.price.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!parsedItems.some(
                (i) => i.type?.toLowerCase() === "fee" || i.item.toLowerCase().includes("platform"),
              ) && (
                <TableRow>
                  <TableCell className="text-muted-foreground text-xs">
                    Platform Protection & Guarantee (15%)
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">Trust Fee</TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {invoice.platformFee.toLocaleString()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col items-end gap-2 text-sm">
          <div className="flex justify-between w-full max-w-xs text-muted-foreground">
            <span>Subtotal:</span>
            <span>
              {invoice.currency} {invoice.baseAmount.toLocaleString()}
            </span>
          </div>
          {(() => {
            const urgencyItem = parsedItems.find(
              (i) =>
                i.type?.toLowerCase() === "urgency" ||
                i.item.toLowerCase().includes("priority") ||
                i.item.toLowerCase().includes("surcharge"),
            );
            return urgencyItem && urgencyItem.price > 0 ? (
              <div className="flex justify-between w-full max-w-xs text-amber-600 dark:text-amber-400 font-semibold">
                <span>Priority Dispatch Surcharge:</span>
                <span>+LKR {urgencyItem.price.toLocaleString()}</span>
              </div>
            ) : null;
          })()}
          <div className="flex justify-between w-full max-w-xs text-muted-foreground">
            <span>Platform Trust Fee (15%):</span>
            <span>
              {invoice.currency} {invoice.platformFee.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between w-full max-w-xs font-bold text-lg text-foreground border-t border-border pt-3 mt-1">
            <span>Total:</span>
            <span className="text-primary font-mono">
              {invoice.currency} {invoice.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {invoice.status === "Paid" && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center gap-4">
            <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                Paid & Verified via Secure Gateway
              </div>
              <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                Funds transferred securely. Provider payout ledger credited with 85% net earnings.
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
