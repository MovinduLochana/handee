import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Plus,
  Trash2,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { usersApi } from "../../api/users";
import { usePaymentMethods } from "../../lib/paymentMethodsStore";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function PaymentMethods() {
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const { methods, addCard, removeCard, setCardDefault } = usePaymentMethods(
    userProfile?.id,
    userProfile?.fullName || "TEST CUSTOMER",
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({
    name: "Personal Card",
    holderName: userProfile?.fullName || "Kasun Perera",
    brand: "Visa",
    last4: "9999",
    expiryMonth: 10,
    expiryYear: 2029,
    isDefault: false,
  });

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    addCard({
      type: "card",
      brand: newCard.brand,
      name: newCard.name.trim() || `${newCard.brand} •••• ${newCard.last4}`,
      last4: newCard.last4,
      expiryMonth: Number(newCard.expiryMonth),
      expiryYear: Number(newCard.expiryYear),
      isDefault: newCard.isDefault || methods.length === 0,
      holderName: newCard.holderName.trim() || userProfile?.fullName || "Cardholder",
    });
    setShowAddForm(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Invoices
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Saved Payment Methods
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage your saved payment cards and digital wallets.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setNewCard((prev) => ({
              ...prev,
              holderName: userProfile?.fullName || prev.holderName,
            }));
            setShowAddForm(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Add Payment Method
        </Button>
      </div>

      {/* Sync Status Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3 text-sm">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <div className="text-foreground">
            <strong className="text-foreground">Secure Vault:</strong> Your saved cards will
            appear securely during checkout.
          </div>
        </CardContent>
      </Card>

      {showAddForm && (
        <Card className="max-w-xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Add Card
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Cardholder Name
                  </label>
                  <Input
                    type="text"
                    value={newCard.holderName}
                    onChange={(e) => setNewCard({ ...newCard, holderName: e.target.value })}
                    placeholder="Cardholder Name"
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Card Label / Nickname
                  </label>
                  <Input
                    type="text"
                    value={newCard.name}
                    onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                    placeholder="e.g. Primary Visa"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Card Brand</label>
                  <select
                    value={newCard.brand}
                    onChange={(e) => setNewCard({ ...newCard, brand: e.target.value })}
                    className="w-full text-sm p-2 rounded border border-border bg-background text-foreground h-9"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">American Express</option>
                    <option value="PayHere">PayHere Demo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Last 4 Digits
                  </label>
                  <Input
                    type="text"
                    maxLength={4}
                    value={newCard.last4}
                    onChange={(e) => setNewCard({ ...newCard, last4: e.target.value })}
                    placeholder="4242"
                    required
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Expiry Month
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={newCard.expiryMonth}
                    onChange={(e) =>
                      setNewCard({ ...newCard, expiryMonth: Number(e.target.value) })
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Expiry Year</label>
                  <Input
                    type="number"
                    min={2026}
                    max={2035}
                    value={newCard.expiryYear}
                    onChange={(e) => setNewCard({ ...newCard, expiryYear: Number(e.target.value) })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="isDefaultCheckbox"
                  checked={newCard.isDefault}
                  onCheckedChange={(checked) => setNewCard({ ...newCard, isDefault: !!checked })}
                />
                <label
                  htmlFor="isDefaultCheckbox"
                  className="text-xs cursor-pointer text-foreground"
                >
                  Set as default payment card for checkout
                </label>
              </div>

              <Button type="submit" className="w-full">
                Save Card
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {methods.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 px-6 space-y-4">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-bold text-foreground">No Payment Methods Saved</h3>
            <p className="text-muted-foreground text-sm">
              Add a payment card to complete settlements quickly.
            </p>
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map((method) => (
            <Card
              key={method.id}
              className={`relative transition-all ${
                method.isDefault ? "border-primary ring-1 ring-primary" : "border-border"
              }`}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm">
                        {method.name || `${method.brand} Card`}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        •••• •••• •••• {method.last4}
                      </div>
                    </div>
                  </div>
                  {method.isDefault ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-[11px]"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Default
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCardDefault(method.id)}
                      className="h-7 text-xs px-2"
                    >
                      Make Default
                    </Button>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  <span>Holder: </span>
                  <strong className="text-foreground">
                    {method.holderName || "TEST CUSTOMER"}
                  </strong>
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 border-t border-border">
                  <span>
                    Expires {String(method.expiryMonth).padStart(2, "0")}/{method.expiryYear}
                  </span>
                  <button
                    onClick={() => removeCard(method.id)}
                    className="text-destructive hover:underline inline-flex items-center gap-1 text-xs"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/50 border-border">
        <CardContent className="p-4 flex items-center gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
          <div>
            <strong className="text-foreground">Secure Vault:</strong> All card details
            are securely encrypted and stored.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
