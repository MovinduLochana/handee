import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "../../api/payments";
import { usersApi } from "../../api/users";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Smartphone,
  Building2,
  Check,
  Shield,
  Loader2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

declare global {
  interface Window {
    payhere?: {
      startPayment: (paymentObject: Record<string, unknown>) => void;
      onCompleted?: (orderId: string) => void;
      onDismissed?: () => void;
      onError?: (error: string) => void;
    };
  }
}

export default function CheckoutPayment() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => paymentsApi.getInvoiceById(id || ""),
    enabled: !!id,
  });

  const [paymentSuccess, setPaymentSuccess] = useState<{
    reference: string;
    amount: number;
    currency: string;
  } | null>(null);

  const [payError, setPayError] = useState<string | null>(null);
  const [isLoading2, setIsLoading2] = useState(false);

  const handlePay = async () => {
    if (!invoice) return;
    setPayError(null);
    setIsLoading2(true);

    try {
      const params = await paymentsApi.getPayHereParams(invoice.id);

      if (typeof window !== "undefined" && window.payhere) {
        window.payhere.onCompleted = async (orderId: string) => {
          setIsLoading2(false);
          try {
            const confirmed = await paymentsApi.confirmPayHerePayment({
              invoiceId: invoice.id,
              orderId,
              paymentId: `ph_${Date.now()}`,
              amount: params.amount,
              currency: params.currency,
              cardLast4: "4242",
              method: "PAYHERE",
            });
            queryClient.invalidateQueries({ queryKey: ["invoice", id] });
            queryClient.invalidateQueries({ queryKey: ["customerInvoices"] });
            setPaymentSuccess({
              reference: confirmed.transactionReference,
              amount: confirmed.amount,
              currency: confirmed.currency,
            });
          } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setPayError(err?.response?.data?.message || "Failed to confirm payment.");
          }
        };

        window.payhere.onDismissed = () => {
          setIsLoading2(false);
        };

        window.payhere.onError = (errorMsg: string) => {
          setIsLoading2(false);
          setPayError(`Payment error: ${errorMsg}`);
        };

        window.payhere.startPayment({
          sandbox: params.sandbox,
          merchant_id: params.merchantId,
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
          notify_url: params.notifyUrl,
          order_id: params.orderId,
          items: params.items,
          amount: params.amountFormatted,
          currency: params.currency,
          hash: params.hash,
          first_name: params.firstName || userProfile?.fullName?.split(" ")[0] || "Customer",
          last_name: params.lastName || "User",
          email: params.email || userProfile?.email || "customer@handee.lk",
          phone: params.phone || "0771234567",
          address: params.address || "Colombo",
          city: params.city || "Colombo",
          country: params.country || "Sri Lanka",
        });
      } else {
        // Fallback: full-screen redirect
        window.location.href = `/api/payments/${invoice.id}/payhere-checkout-html`;
      }
    } catch (err: any) {
      setIsLoading2(false);
      setPayError(err?.response?.data?.message || "Failed to initiate payment.");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="text-center p-12 text-muted-foreground">
            <p>Initializing secure checkout...</p>
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
            <h2 className="text-xl font-bold text-foreground">Invoice not found</h2>
            <Link to="/invoices" className={buttonVariants({ variant: "outline" })}>
              Return to Invoices
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Already paid ─────────────────────────────────────────────────────────
  if (invoice.status === "Paid" && !paymentSuccess) {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card>
          <CardContent className="text-center p-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Invoice Already Paid</h2>
            <p className="text-muted-foreground text-sm">
              This invoice has already been settled successfully.
            </p>
            <Link to={`/invoices/${invoice.id}`} className={buttonVariants({ variant: "default" })}>
              View Receipt
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Payment success ───────────────────────────────────────────────────────
  if (paymentSuccess) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12 px-6 space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Payment Successful</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Your payment has been processed securely via PayHere.
              </p>
            </div>

            <div className="bg-muted p-4 rounded text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <strong className="text-foreground font-mono">
                  {paymentSuccess.currency} {paymentSuccess.amount.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction Ref:</span>
                <span className="font-mono font-semibold text-primary">
                  {paymentSuccess.reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gateway:</span>
                <span className="text-foreground">PayHere</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Link
                to={`/invoices/${invoice.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                View Receipt
              </Link>
              <Link to="/invoices" className={buttonVariants({ variant: "default" })}>
                Done <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main checkout ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-xs"
            >
              <Lock className="h-3 w-3" /> Secure Checkout
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Secure Checkout</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Complete payment for Invoice{" "}
            <strong className="text-foreground font-mono">
              INV-{invoice.id.slice(0, 8).toUpperCase()}
            </strong>
          </p>
        </div>
        <Link to={`/invoices/${invoice.id}`} className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Payment Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Payment Method
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[11px] gap-1.5 font-medium px-2 py-0.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Secure Gateway
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                All transactions are encrypted and processed securely via PayHere, Central Bank of Sri Lanka approved payment provider.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* PayHere Selected Option Card */}
              <div className="rounded-xl border border-primary/40 bg-primary/[0.03] dark:bg-primary/[0.06] p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-background border border-border shadow-sm flex items-center justify-center font-black text-xs tracking-wider text-amber-500">
                      PH
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        PayHere Secure Gateway
                        <Badge variant="secondary" className="text-[10px] font-semibold tracking-wide py-0 px-1.5">
                          Instant
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Credit/Debit Cards, Mobile Wallets & Internet Banking
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 self-start sm:self-center">
                    <Check className="h-4 w-4 stroke-[2.5]" />
                    <span>Selected</span>
                  </div>
                </div>

                {/* Accepted Payment Channels */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/50 flex items-center gap-2.5">
                    <CreditCard className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-[11px]">Cards</div>
                      <div className="text-[10px] text-muted-foreground">Visa, Mastercard, AMEX</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/50 flex items-center gap-2.5">
                    <Smartphone className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-[11px]">Mobile Wallets</div>
                      <div className="text-[10px] text-muted-foreground">eZ Cash, mCash, FriMi, Genie</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/50 flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="font-medium text-foreground text-[11px]">Bank Transfer</div>
                      <div className="text-[10px] text-muted-foreground">Major Sri Lankan Banks</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Customer Info */}
              <div className="rounded-lg border border-border/70 bg-muted/40 p-4 space-y-2">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Billing Contact</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Linked to account</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[11px]">Customer Name</span>
                    <p className="font-medium text-foreground">
                      {userProfile?.fullName || "Valued Customer"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[11px]">Billing Email</span>
                    <p className="font-medium text-foreground font-mono truncate">
                      {userProfile?.email || "customer@handee.lk"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error */}
              {payError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{payError}</AlertDescription>
                </Alert>
              )}

              {/* Pay Button */}
              <div className="space-y-3 pt-1">
                <Button
                  onClick={handlePay}
                  disabled={isLoading2}
                  className="w-full py-6 text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                  size="lg"
                >
                  {isLoading2 ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening Payment Gateway...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Pay LKR {invoice.totalAmount.toLocaleString()} via PayHere
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] text-muted-foreground">
                  You will be securely redirected to PayHere to authorize your payment. No card credentials are saved on Handee.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    256-bit SSL Encryption
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    PCI-DSS Level 1 Compliant
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-sky-500" />
                    Bank-Grade Security
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                {(() => {
                  let urgencySurcharge = 0;
                  let standardLabor = invoice.baseAmount;
                  if (invoice.lineItemsJson) {
                    try {
                      const items = JSON.parse(invoice.lineItemsJson);
                      if (Array.isArray(items)) {
                        const urg = items.find(
                          (i: any) =>
                            i.type?.toLowerCase() === "urgency" ||
                            i.item?.toLowerCase().includes("priority") ||
                            i.item?.toLowerCase().includes("surcharge"),
                        );
                        if (urg && urg.price) {
                          urgencySurcharge = urg.price;
                          standardLabor = Math.max(0, invoice.baseAmount - urgencySurcharge);
                        }
                      }
                    } catch {}
                  }

                  return (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Standard Service Labor:</span>
                        <span className="font-semibold text-foreground">
                          LKR {standardLabor.toLocaleString()}
                        </span>
                      </div>
                      {urgencySurcharge > 0 && (
                        <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                          <span>Priority Dispatch Surcharge:</span>
                          <span>+LKR {urgencySurcharge.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform Fee (15%):</span>
                  <span>LKR {invoice.platformFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-bold text-base text-foreground">
                  <span>Total Due:</span>
                  <span className="text-primary font-mono">
                    LKR {invoice.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-muted p-3.5 rounded space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Buyer Protection
                </div>
                <p>
                  Funds are held securely and released to the provider only upon confirmed service completion.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
