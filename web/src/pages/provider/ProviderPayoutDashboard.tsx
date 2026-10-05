import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, type ProviderBankAccountDto } from "../../api/payments";
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
  Landmark,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Building,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SRI_LANKAN_BANKS = [
  "Commercial Bank of Ceylon",
  "Sampath Bank",
  "Bank of Ceylon (BOC)",
  "Hatton National Bank (HNB)",
  "People's Bank",
  "Nations Trust Bank (NTB)",
  "Seylan Bank",
  "DFCC Bank",
  "National Development Bank (NDB)",
  "Union Bank of Colombo",
  "Pan Asia Banking Corporation",
  "Amana Bank",
  "Cargills Bank",
  "Standard Chartered Bank",
  "HSBC Sri Lanka",
  "Other / Foreign Bank",
];

export default function ProviderPayoutDashboard() {
  const queryClient = useQueryClient();

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

  const { data: bankAccount } = useQuery({
    queryKey: ["providerBankAccount", userProfile?.id],
    queryFn: () => paymentsApi.getProviderBankAccount(),
    enabled: !!userProfile?.id,
  });

  const totalEarnings = summary?.totalEarnings ?? 0;
  const availableBalance = summary?.availableBalance ?? 0;
  const pendingPayouts = summary?.pendingPayouts ?? 0;
  const completedJobs = summary?.completedJobsCount ?? 0;
  const completedPayouts = payouts.filter((p) => p.status === "Completed" || p.status === "Withdrawn");

  // Dialog States
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Bank Form State
  const [bankName, setBankName] = useState(bankAccount?.bankName || SRI_LANKAN_BANKS[0]);
  const [branchName, setBranchName] = useState(bankAccount?.branchName || "");
  const [branchCode, setBranchCode] = useState(bankAccount?.branchCode || "");
  const [accountNumber, setAccountNumber] = useState(bankAccount?.accountNumber || "");
  const [accountHolderName, setAccountHolderName] = useState(
    bankAccount?.accountHolderName || userProfile?.fullName || ""
  );
  const [bankError, setBankError] = useState<string | null>(null);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);

  // Save Bank Details Mutation
  const saveBankMutation = useMutation({
    mutationFn: (dto: ProviderBankAccountDto) => paymentsApi.saveProviderBankAccount(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerBankAccount"] });
      queryClient.invalidateQueries({ queryKey: ["providerSummary"] });
      setIsBankModalOpen(false);
      setBankError(null);
    },
    onError: (err: any) => {
      setBankError(err.response?.data?.message || err.message || "Failed to save bank details.");
    },
  });

  // Request Withdrawal Mutation
  const withdrawMutation = useMutation({
    mutationFn: (amount?: number) => paymentsApi.requestWithdrawal(amount),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["providerSummary"] });
      queryClient.invalidateQueries({ queryKey: ["providerPayouts"] });
      setWithdrawSuccessMsg(
        `Withdrawal request for LKR ${data.amountRequested.toLocaleString()} created (Ref: ${data.batchReference}). Funds queued for bank disbursement.`
      );
      setWithdrawError(null);
      setTimeout(() => {
        setIsWithdrawModalOpen(false);
        setWithdrawSuccessMsg(null);
        setWithdrawAmount("");
      }, 2500);
    },
    onError: (err: any) => {
      setWithdrawError(
        err.response?.data?.message || err.message || "Failed to submit withdrawal request."
      );
    },
  });

  const handleOpenBankModal = () => {
    if (bankAccount) {
      setBankName(bankAccount.bankName);
      setBranchName(bankAccount.branchName);
      setBranchCode(bankAccount.branchCode || "");
      setAccountNumber(bankAccount.accountNumber);
      setAccountHolderName(bankAccount.accountHolderName);
    } else if (userProfile?.fullName) {
      setAccountHolderName(userProfile.fullName);
    }
    setBankError(null);
    setIsBankModalOpen(true);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !branchName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      setBankError("All fields except branch code are required.");
      return;
    }
    saveBankMutation.mutate({
      bankName: bankName.trim(),
      branchName: branchName.trim(),
      branchCode: branchCode.trim() || undefined,
      accountNumber: accountNumber.trim(),
      accountHolderName: accountHolderName.trim(),
    });
  };

  const handleOpenWithdrawModal = () => {
    setWithdrawAmount(availableBalance > 0 ? availableBalance.toString() : "");
    setWithdrawError(null);
    setWithdrawSuccessMsg(null);
    setIsWithdrawModalOpen(true);
  };

  const handleConfirmWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = withdrawAmount ? parseFloat(withdrawAmount) : availableBalance;
    if (isNaN(parsed) || parsed <= 0) {
      setWithdrawError("Please enter a valid withdrawal amount.");
      return;
    }
    if (parsed > availableBalance) {
      setWithdrawError(`Requested amount exceeds available balance of LKR ${availableBalance.toLocaleString()}.`);
      return;
    }
    withdrawMutation.mutate(parsed);
  };

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenBankModal}
            className="border-primary/30 hover:border-primary"
          >
            <Landmark className="h-4 w-4 mr-1.5 text-primary" />
            {bankAccount ? "Edit Bank Details" : "Link Bank Account"}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleOpenWithdrawModal}
            disabled={availableBalance <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowUpRight className="h-4 w-4 mr-1.5" /> Withdraw to Bank
          </Button>

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
              {`LKR ${totalEarnings.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>

        <Card className={availableBalance > 0 ? "border-emerald-500/40 bg-emerald-500/[0.02]" : ""}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Available for Payout
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-foreground font-mono">
              {`LKR ${availableBalance.toLocaleString()}`}
            </div>
            {availableBalance > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleOpenWithdrawModal}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 p-0 h-auto"
              >
                Withdraw &rarr;
              </Button>
            )}
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
              {`LKR ${pendingPayouts.toLocaleString()}`}
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

      {/* Linked Bank Account Card */}
      {bankAccount ? (
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground text-sm">{bankAccount.bankName}</h3>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] gap-1 py-0"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Ready for CEFT Direct Deposit
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Account: <span className="font-mono font-semibold">•••• {bankAccount.accountNumber.slice(-4) || bankAccount.accountNumber}</span>{" "}
                  &bull; Branch: {bankAccount.branchName} &bull; Holder: {bankAccount.accountHolderName}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleOpenBankModal}>
                Edit Bank Details
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenWithdrawModal}
                disabled={availableBalance <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Withdraw LKR {availableBalance.toLocaleString()}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/30 bg-amber-500/[0.05]">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">No Bank Account Linked</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Link your Sri Lankan bank account (Commercial Bank, Sampath, BOC, etc.) to request automated withdrawals and bank deposits.
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenBankModal}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <Landmark className="h-4 w-4 mr-1.5" /> Link Bank Account
            </Button>
          </CardContent>
        </Card>
      )}

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

      {/* Recent Payouts Table - Only Completed Disbursements */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Recent Completed Payouts
          </CardTitle>
          <Link
            to="/provider/payouts/history"
            className="text-xs text-primary hover:underline font-semibold"
          >
            View All ({completedPayouts.length})
          </Link>
        </CardHeader>

        {isPayoutsLoading ? (
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            Loading payouts...
          </CardContent>
        ) : completedPayouts.length === 0 ? (
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            No completed payout disbursements yet. Use &ldquo;Withdraw to Bank&rdquo; above to request a payout for your available balance.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payout Ref</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Disbursed Date</TableHead>
                  <TableHead>Gross Charged</TableHead>
                  <TableHead>15% Platform Fee</TableHead>
                  <TableHead>Net Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedPayouts.slice(0, 5).map((payout) => (
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
                      <Badge
                        variant="outline"
                        className={
                          payout.status === "Completed"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
                            : payout.status === "Withdrawn"
                            ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs"
                            : "text-xs"
                        }
                      >
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={
                          payout.invoiceId
                            ? `/invoices/${payout.invoiceId}`
                            : payout.bookingId
                            ? `/invoices/booking/${payout.bookingId}`
                            : "/invoices"
                        }
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

      {/* ── Dialog: Link / Edit Bank Account ── */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              {bankAccount ? "Edit Bank Account" : "Link Sri Lankan Bank Account"}
            </DialogTitle>
            <DialogDescription>
              Direct bank deposits (CEFT / SLIPS) are disbursed into this account once payouts are approved.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBank} className="space-y-4 py-2">
            {bankError && (
              <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {bankError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bankName">Bank Name *</Label>
              <select
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {SRI_LANKAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branchName">Branch Name *</Label>
                <Input
                  id="branchName"
                  placeholder="e.g. Kollupitiya"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branchCode">Branch Code (Optional)</Label>
                <Input
                  id="branchCode"
                  placeholder="e.g. 042"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                placeholder="e.g. 8123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountHolderName">Account Holder Name *</Label>
              <Input
                id="accountHolderName"
                placeholder="Full Name as shown on Bank Passbook/Statement"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Must match your registered provider identity for automated clearance.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsBankModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveBankMutation.isPending}>
                {saveBankMutation.isPending ? "Saving..." : "Save Bank Details"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Request Withdrawal to Bank ── */}
      <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              Request Withdrawal to Bank
            </DialogTitle>
            <DialogDescription>
              Submit an automated bank transfer request for your available net earnings.
            </DialogDescription>
          </DialogHeader>

          {!bankAccount ? (
            <div className="space-y-4 py-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-xs">
                You must link a verified bank account before requesting a withdrawal.
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsWithdrawModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsWithdrawModalOpen(false);
                    handleOpenBankModal();
                  }}
                >
                  <Landmark className="h-4 w-4 mr-1.5" /> Link Bank Account
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleConfirmWithdraw} className="space-y-4 py-2">
              {withdrawError && (
                <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                  {withdrawError}
                </div>
              )}

              {withdrawSuccessMsg && (
                <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{withdrawSuccessMsg}</span>
                </div>
              )}

              {/* Destination Bank Summary */}
              <div className="p-3 bg-muted/40 border rounded-lg text-xs space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-primary" />
                  Destination Account
                </div>
                <div className="text-muted-foreground">
                  {bankAccount.bankName} &bull; Account: •••• {bankAccount.accountNumber.slice(-4)}
                </div>
                <div className="text-muted-foreground">Holder: {bankAccount.accountHolderName}</div>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label htmlFor="withdrawAmount">Amount to Withdraw (LKR)</Label>
                  <span className="text-muted-foreground">
                    Available:{" "}
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(availableBalance.toString())}
                      className="font-bold text-primary hover:underline font-mono"
                    >
                      LKR {availableBalance.toLocaleString()}
                    </button>
                  </span>
                </div>
                <Input
                  id="withdrawAmount"
                  type="number"
                  step="0.01"
                  min="1"
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Max: ${availableBalance}`}
                  required
                />
              </div>

              <div className="text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded border">
                Bank transfers are dispatched via Sri Lanka CEFT / SLIPS direct clearing upon Admin settlement release.
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  disabled={withdrawMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={withdrawMutation.isPending || !!withdrawSuccessMsg || availableBalance <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {withdrawMutation.isPending ? "Submitting..." : "Confirm Withdrawal"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
