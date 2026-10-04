import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, type ProcessPaymentRequestDto } from "../../api/payments";
import { usersApi } from "../../api/users";
import { usePaymentMethods } from "../../lib/paymentMethodsStore";
import {
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CheckoutPayment() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const { methods, addCard } = usePaymentMethods(
    userProfile?.id,
    userProfile?.fullName || "TEST CUSTOMER",
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCard, setQuickCard] = useState({
    brand: "Visa",
    last4: "8888",
    expiryMonth: 12,
    expiryYear: 2029,
    name: "Quick Checkout Card",
  });

  const [paymentSuccess, setPaymentSuccess] = useState<{
    reference: string;
    amount: number;
    currency: string;
  } | null>(null);

  const [prevUserId, setPrevUserId] = useState<string | undefined>(userProfile?.id);

  // Automatically select default card or update selection when user profile finishes loading
  useEffect(() => {
    if (userProfile?.id !== prevUserId) {
      setPrevUserId(userProfile?.id);
      const def = methods.find((m) => m.isDefault) || methods[0];
      if (def) {
        setSelectedId(def.id);
      }
      return;
    }

    if (methods.length > 0) {
      if (!selectedId || !methods.some((m) => m.id === selectedId)) {
        const def = methods.find((m) => m.isDefault) || methods[0];
        if (def) {
          setSelectedId(def.id);
        }
      }
    }
  }, [userProfile?.id, methods, selectedId, prevUserId]);

  const activeCard =
    methods.find((m) => m.id === selectedId) || methods.find((m) => m.isDefault) || methods[0];

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => paymentsApi.getInvoiceById(id || ""),
    enabled: !!id,
  });

  const payMutation = useMutation({
    mutationFn: (dto: ProcessPaymentRequestDto) => paymentsApi.processPayment(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["customerInvoices"] });
      setPaymentSuccess({
        reference: data.transactionReference,
        amount: data.amount,
        currency: data.currency,
      });
    },
  });

  const handlePay = () => {
    if (!invoice || !activeCard) return;
    payMutation.mutate({
      invoiceId: invoice.id,
      paymentMethod: "card",
      paymentToken: activeCard.token || `tok_${activeCard.brand.toLowerCase()}_sandbox`,
      last4: activeCard.last4,
      gatewayProvider: activeCard.brand === "PayHere" ? "PayHere-Sandbox" : "Stripe-Sandbox",
    });
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = addCard({
      type: "card",
      brand: quickCard.brand,
      name: quickCard.name.trim() || `${quickCard.brand} •••• ${quickCard.last4}`,
      last4: quickCard.last4,
      expiryMonth: Number(quickCard.expiryMonth),
      expiryYear: Number(quickCard.expiryYear),
      isDefault: true,
      holderName: userProfile?.fullName || "TEST CUSTOMER",
    });
    const createdItem = updated[updated.length - 1];
    if (createdItem) {
      setSelectedId(createdItem.id);
    }
    setShowQuickAdd(false);
  };

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

  if (invoice.status === "Paid" && !paymentSuccess) {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card>
          <CardContent className="text-center p-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Invoice Already Settled</h2>
            <p className="text-muted-foreground text-sm">
              This invoice has already been paid successfully.
            </p>
            <Link to={`/invoices/${invoice.id}`} className={buttonVariants({ variant: "default" })}>
              View Receipt
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12 px-6 space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Settlement authorized via {activeCard?.brand || "Sandbox Card"} (
                {activeCard?.last4 || "4242"})
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
                <span className="text-foreground">
                  {activeCard?.brand === "PayHere"
                    ? "PayHere Sandbox"
                    : "Stripe Sandbox (Polly Resilient)"}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Link
                to={`/invoices/${invoice.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                View Itemised Receipt
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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 text-xs"
            >
              <Lock className="h-3 w-3" /> Sandbox Payment Gateway
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Secure Checkout</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Complete settlement for Invoice{" "}
            <strong className="text-foreground font-mono">
              INV-{invoice.id.slice(0, 8).toUpperCase()}
            </strong>
          </p>
        </div>
        <Link to={`/invoices/${invoice.id}`} className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>

      {payMutation.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment Failed:</strong>{" "}
            {(payMutation.error as any)?.response?.data?.message ||
              (payMutation.error as Error)?.message ||
              "Sandbox card declined. Please try again."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Payment Form & Card Selector */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Choose Sandbox Payment Card
                </CardTitle>
                <Link
                  to="/account/payment-methods"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Manage Saved Cards
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                Synced with your saved payment vault. Select a card or add a new one.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* List of Synchronized Saved Cards */}
              <div className="space-y-2.5">
                {methods.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <CreditCard className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">No saved cards yet.</p>
                    <p className="text-xs text-muted-foreground">
                      Add a card below to complete your payment.
                    </p>
                  </div>
                ) : (
                  methods.map((card) => {
                    const isSelected = activeCard?.id === card.id;
                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedId(card.id)}
                        className={`flex items-center justify-between p-3.5 rounded border transition-colors cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-primary bg-primary" : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                              {card.name || `${card.brand} •••• ${card.last4}`}
                              {card.isDefault && (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0"
                                >
                                  Default
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              •••• •••• •••• {card.last4}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-muted-foreground block">
                            Exp {String(card.expiryMonth).padStart(2, "0")}/
                            {String(card.expiryYear).slice(-2)}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {card.brand}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Add Card Toggle */}
              <div>
                {!showQuickAdd ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuickAdd(true)}
                    className="w-full gap-2 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Another Card to Vault
                  </Button>
                ) : (
                  <form
                    onSubmit={handleQuickAdd}
                    className="bg-muted/50 p-4 rounded border border-dashed border-primary/40 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <strong className="text-xs font-semibold text-foreground">
                        Add Card Directly to Vault
                      </strong>
                      <button
                        type="button"
                        onClick={() => setShowQuickAdd(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Brand</label>
                        <select
                          value={quickCard.brand}
                          onChange={(e) => setQuickCard({ ...quickCard, brand: e.target.value })}
                          className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                        >
                          <option value="Visa">Visa</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="Amex">American Express</option>
                          <option value="PayHere">PayHere Demo</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Last 4</label>
                        <Input
                          type="text"
                          maxLength={4}
                          value={quickCard.last4}
                          onChange={(e) => setQuickCard({ ...quickCard, last4: e.target.value })}
                          required
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm" className="w-full text-xs">
                      Save to Vault & Select
                    </Button>
                  </form>
                )}
              </div>

              {/* Card Simulator Display */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-lg p-5 h-44 flex flex-col justify-between shadow-lg relative overflow-hidden border border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="w-10 h-7 rounded bg-gradient-to-tr from-amber-400 to-amber-600" />
                  <span className="font-bold tracking-wider text-sm">
                    {activeCard?.brand || "Visa"}
                  </span>
                </div>
                <div className="font-mono text-lg tracking-widest">
                  {`•••• •••• •••• ${activeCard?.last4 || "4242"}`}
                </div>
                <div className="flex justify-between text-xs tracking-wider uppercase opacity-80">
                  <div>
                    <div className="text-[9px] opacity-60">Card Holder</div>
                    <div className="font-semibold">
                      {activeCard?.holderName || userProfile?.fullName || "TEST CUSTOMER"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] opacity-60">Expires</div>
                    <div className="font-semibold">
                      {activeCard
                        ? `${String(activeCard.expiryMonth).padStart(2, "0")}/${String(activeCard.expiryYear).slice(-2)}`
                        : "12/28"}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePay}
                disabled={payMutation.isPending || !activeCard}
                className="w-full py-6 text-sm font-bold gap-2"
                size="lg"
              >
                <Lock className="h-4 w-4" />
                {payMutation.isPending
                  ? "Simulating Gateway Processing..."
                  : `Authorize & Pay LKR ${invoice.totalAmount.toLocaleString()}`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Order Breakdown</CardTitle>
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
                  <span>Platform Trust Fee (15%):</span>
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
                  Escrow Protected Payment
                </div>
                <p>
                  Platform retains funds until service completion is confirmed. The provider is
                  directly credited upon your payment.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
