import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function QuoteReview() {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAccepted, setIsAccepted] = useState(false);

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bookingInvoice", bookingId],
    queryFn: () => paymentsApi.getInvoiceByBookingId(bookingId || ""),
    enabled: !!bookingId,
    retry: 1,
  });

  // Fallback quote values if invoice is still in estimation or draft
  const baseAmount = invoice?.baseAmount ?? 4500;
  const platformFee = invoice?.platformFee ?? Math.round(baseAmount * 0.15);
  const totalAmount = invoice?.totalAmount ?? baseAmount + platformFee;

  const parsedItems: Array<{ item: string; price: number; type?: string }> = invoice?.lineItemsJson
    ? (() => {
        try {
          const val = JSON.parse(invoice.lineItemsJson);
          return Array.isArray(val) ? val : [{ item: "Service Work", price: baseAmount }];
        } catch {
          return [{ item: "Estimated Service", price: baseAmount }];
        }
      })()
    : [
        { item: "Standard Labor & Service", price: Math.round(baseAmount * 0.7), type: "Labor" },
        {
          item: "Consumables & Parts Allowance",
          price: Math.round(baseAmount * 0.3),
          type: "Materials",
        },
      ];

  const handleAcceptQuote = () => {
    setIsAccepted(true);
    if (invoice?.id) {
      navigate(`/invoices/${invoice.id}/pay`);
    } else {
      navigate("/invoices");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 text-xs"
            >
              <Zap className="h-3 w-3" /> AI Estimate & Verified Quote
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Quote Review</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Booking Ref:{" "}
            <strong className="text-foreground font-mono">{bookingId?.slice(0, 8)}...</strong> •
            Transparent breakdown with zero hidden fees
          </p>
        </div>
        <Link to="/bookings" className={buttonVariants({ variant: "outline" })}>
          Back to Bookings
        </Link>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="text-center p-12 text-muted-foreground">
            <p>Calculating verified quote breakdown...</p>
          </CardContent>
        </Card>
      )}

      {error && !invoice && (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription>
            <strong>Using Estimated Baseline:</strong> Detailed invoice is pending provider
            dispatch. Below is the automated AI baseline quote for this category.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Itemised Service Estimate
              </CardTitle>
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold"
              >
                Price Locked
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border border-border rounded overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount (LKR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedItems.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">{line.item}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {line.type || "Service"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          {line.price.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="text-muted-foreground text-xs">
                        Platform Trust & Safety Fee
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-primary text-xs"
                        >
                          15% Included
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {platformFee.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-end gap-2 text-sm">
                <div className="flex justify-between w-full max-w-xs text-muted-foreground">
                  <span>Base Service Rate:</span>
                  <span>LKR {baseAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-full max-w-xs text-muted-foreground">
                  <span>Trust & Platform Fee (15%):</span>
                  <span>LKR {platformFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-full max-w-xs font-bold text-lg text-foreground border-t border-border pt-3 mt-1">
                  <span>Total Payable:</span>
                  <span className="text-primary font-mono">LKR {totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-foreground text-sm">Ready to confirm this quote?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your payment will only be released to the provider upon your satisfaction.
                </p>
              </div>
              <Button onClick={handleAcceptQuote} disabled={isAccepted} className="gap-2 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
                Accept Quote & Pay
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Handee Guarantee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-muted-foreground">
              <ul className="list-disc pl-4 space-y-2 text-foreground">
                <li>
                  <strong className="text-foreground">Escrow Protection:</strong> Funds remain
                  securely held in sandbox escrow until you approve job completion.
                </li>
                <li>
                  <strong className="text-foreground">No Surprise Surges:</strong> Quote is binding
                  for the initial agreed scope of work.
                </li>
                <li>
                  <strong className="text-foreground">Dispute Resolution:</strong> 24/7 dedicated
                  mediation if work does not match criteria.
                </li>
              </ul>

              <div className="bg-muted p-3.5 rounded flex items-center gap-2.5 text-xs text-muted-foreground">
                <HelpCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  Need adjustments or extra parts added? Contact your assigned provider through the
                  booking chat.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
