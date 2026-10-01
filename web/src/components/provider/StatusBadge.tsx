import type { VerificationStatus, DocumentReviewStatus } from "../../api/types";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: VerificationStatus | DocumentReviewStatus;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  Pending: {
    label: "Pending",
    variant: "secondary",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  InReview: {
    label: "In Review",
    variant: "secondary",
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  },
  Verified: {
    label: "Verified",
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  Approved: {
    label: "Approved",
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  Rejected: { label: "Rejected", variant: "destructive", className: "" },
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: "secondary" as const,
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  }[size];

  return (
    <Badge
      variant={config.variant}
      className={`status-badge inline-flex items-center gap-1.5 font-medium border ${sizeClasses} ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
      {config.label}
    </Badge>
  );
}
