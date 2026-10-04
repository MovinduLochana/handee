import { useState, useEffect } from "react";
import {
  Flame,
  Zap,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  pricingConfigApi,
  type UrgencyMultiplierConfigDto,
  type UpdateUrgencyMultiplierConfigDto,
} from "../../api/pricingConfig";

const DEFAULT_MULTIPLIERS: UpdateUrgencyMultiplierConfigDto = {
  low: 0.95,
  normal: 1.00,
  medium: 1.05,
  high: 1.20,
  emergency: 1.40,
};

export default function UrgencyMultipliersConfig() {
  const [config, setConfig] = useState<UpdateUrgencyMultiplierConfigDto>(DEFAULT_MULTIPLIERS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Live simulation calculator benchmark
  const [sampleBasePrice, setSampleBasePrice] = useState<number>(2000);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data: UrgencyMultiplierConfigDto = await pricingConfigApi.getUrgencyMultipliers();
      setConfig({
        low: data.low,
        normal: data.normal,
        medium: data.medium,
        high: data.high,
        emergency: data.emergency,
      });
      setLastUpdated(data.lastUpdatedAt || null);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load dynamic pricing configuration. Showing defaults."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMultiplierChange = (
    field: keyof UpdateUrgencyMultiplierConfigDto,
    value: string
  ) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setConfig((prev) => ({ ...prev, [field]: num }));
      setSuccessMsg(null);
    }
  };

  const validateOrdering = (): string | null => {
    if (config.low > config.normal) return "Low multiplier cannot be higher than Normal (1.00).";
    if (config.normal > config.medium) return "Normal multiplier cannot exceed Medium.";
    if (config.medium > config.high) return "Medium multiplier cannot exceed High.";
    if (config.high > config.emergency) return "High multiplier cannot exceed Emergency.";
    if (config.emergency < 1.20 || config.emergency > 3.00)
      return "Emergency multiplier must be between 1.20 and 3.00.";
    return null;
  };

  const validationError = validateOrdering();

  const handleSave = async () => {
    const err = validateOrdering();
    if (err) {
      setErrorMsg(err);
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await pricingConfigApi.updateUrgencyMultipliers(config);
      setConfig({
        low: updated.low,
        normal: updated.normal,
        medium: updated.medium,
        high: updated.high,
        emergency: updated.emergency,
      });
      setLastUpdated(updated.lastUpdatedAt || new Date().toISOString());
      setSuccessMsg(
        "Urgency multipliers saved successfully! The Python AI dispatch agent and booking engine will use these values immediately."
      );
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to save urgency multipliers."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_MULTIPLIERS);
    setSuccessMsg("Reset to system defaults. Click 'Save Multipliers' to persist to database.");
    setErrorMsg(null);
  };

  const tiers: {
    key: keyof UpdateUrgencyMultiplierConfigDto;
    label: string;
    sublabel: string;
    badgeColor: string;
    description: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    {
      key: "low",
      label: "Low / Flexible",
      sublabel: "Non-urgent / Flexible slot",
      badgeColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
      description: "Discounted rate for customers flexible with timing.",
      min: 0.70,
      max: 1.10,
      step: 0.01,
    },
    {
      key: "normal",
      label: "Normal",
      sublabel: "Baseline standard",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      description: "Platform standard rate (anchored to 1.00x baseline).",
      min: 0.95,
      max: 1.05,
      step: 0.01,
    },
    {
      key: "medium",
      label: "Medium",
      sublabel: "Standard dispatch",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      description: "Default customer urgency tier for standard booking.",
      min: 1.00,
      max: 1.40,
      step: 0.01,
    },
    {
      key: "high",
      label: "High",
      sublabel: "Same-day priority",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      description: "Prioritized scheduling for same-day requests.",
      min: 1.10,
      max: 1.80,
      step: 0.01,
    },
    {
      key: "emergency",
      label: "Emergency",
      sublabel: "Immediate response (< 60m)",
      badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      description: "Instant match dispatch for urgent domestic breakdowns.",
      min: 1.20,
      max: 3.00,
      step: 0.01,
    },
  ];

  return (
    <Card className="border-border shadow-xs overflow-hidden transition-all">
      <CardHeader className="bg-muted/30 border-b border-border p-4 sm:p-5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg font-bold">
                Urgency Multipliers & Dynamic Pricing Engine
              </CardTitle>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs">
                Live AI Synced
              </Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm mt-0.5">
              Configures surge multipliers without hardcoding. Multipliers scale customer price and reward rush providers.
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">{errorMsg}</AlertDescription>
            </Alert>
          )}

          {successMsg && (
            <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="text-xs sm:text-sm font-medium">{successMsg}</AlertDescription>
            </Alert>
          )}

          {validationError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm font-medium">
                {validationError}
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {tiers.map((t) => {
              const currentVal = config[t.key];
              const pctDiff = Math.round((currentVal - 1.0) * 100);
              const sign = pctDiff > 0 ? "+" : "";

              return (
                <div
                  key={t.key}
                  className="p-4 rounded-xl border border-border/80 bg-card/60 hover:bg-muted/10 transition-colors space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{t.label}</span>
                    <Badge variant="outline" className={`text-[11px] font-mono ${t.badgeColor}`}>
                      {sign}{pctDiff}%
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 h-8">
                    {t.description}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Multiplier (x)</span>
                      <span className="font-mono font-medium text-foreground">{currentVal.toFixed(2)}x</span>
                    </div>

                    <Input
                      type="number"
                      step={t.step}
                      min={t.min}
                      max={t.max}
                      value={currentVal}
                      onChange={(e) => handleMultiplierChange(t.key, e.target.value)}
                      disabled={loading || saving}
                      className="font-mono text-center font-bold text-sm bg-background/50 h-9"
                    />

                    <input
                      type="range"
                      min={t.min}
                      max={t.max}
                      step={t.step}
                      value={currentVal}
                      onChange={(e) => handleMultiplierChange(t.key, e.target.value)}
                      disabled={loading || saving}
                      className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Financial Breakdown & Live Simulation Calculator */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">
                  Live Financial Simulation & Provider Protection Preview
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="sample-price" className="text-xs text-muted-foreground whitespace-nowrap">
                  Benchmark Base Price:
                </Label>
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                    Rs.
                  </span>
                  <Input
                    id="sample-price"
                    type="number"
                    min={500}
                    step={250}
                    value={sampleBasePrice}
                    onChange={(e) => setSampleBasePrice(Math.max(100, Number(e.target.value) || 0))}
                    className="h-8 pl-8 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Fair Marketplace Guarantee: Customer is charged an urgency surcharge for high/emergency priority.
              The provider earns 85% of total value (including rush compensation) and is never penalized for speed.
            </p>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-lg border border-border/80 bg-background/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border font-medium text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Urgency Tier</th>
                    <th className="py-2.5 px-3 text-right">Multiplier</th>
                    <th className="py-2.5 px-3 text-right">Customer Total</th>
                    <th className="py-2.5 px-3 text-right">Urgency Surcharge</th>
                    <th className="py-2.5 px-3 text-right">Provider Payout (85%)</th>
                    <th className="py-2.5 px-3 text-right">Platform Fee (15%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-mono">
                  {tiers.map((t) => {
                    const mult = config[t.key];
                    const customerTotal = Math.round(sampleBasePrice * mult);
                    const urgencySurcharge = Math.max(0, customerTotal - sampleBasePrice);
                    const providerPayout = Math.round(customerTotal * 0.85);
                    const platformFee = customerTotal - providerPayout;

                    const isHighlight = t.key === "emergency";

                    return (
                      <tr
                        key={t.key}
                        className={isHighlight ? "bg-primary/5 font-semibold text-foreground" : "hover:bg-muted/30"}
                      >
                        <td className="py-2 px-3 font-sans flex items-center gap-1.5">
                          {isHighlight && <Zap className="h-3 w-3 text-rose-500 fill-rose-500" />}
                          {t.label}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{mult.toFixed(2)}x</td>
                        <td className="py-2 px-3 text-right text-foreground font-bold">
                          Rs. {customerTotal.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">
                          {urgencySurcharge > 0 ? `+Rs. ${urgencySurcharge.toLocaleString()}` : "Rs. 0"}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                          Rs. {providerPayout.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">
                          Rs. {platformFee.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border/80">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                {lastUpdated
                  ? `Last updated: ${new Date(lastUpdated).toLocaleDateString()} ${new Date(lastUpdated).toLocaleTimeString()}`
                  : "Using platform initial seed configuration"}
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={loading || saving}
                className="gap-1.5 text-xs h-9 flex-1 sm:flex-none"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Defaults
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading || saving || !!validationError}
                className="gap-1.5 text-xs h-9 flex-1 sm:flex-none shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Multipliers"}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
