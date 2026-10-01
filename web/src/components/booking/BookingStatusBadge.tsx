import type { BookingStatus, JobRequestStatus } from "../../api/types";
import { BOOKING_STATUS_LABELS } from "../../api/bookings";
import { JOB_REQUEST_STATUS_LABELS } from "../../api/jobRequests";
import { Badge } from "@/components/ui/badge";

interface BookingStatusBadgeProps {
  status: BookingStatus | JobRequestStatus;
  size?: "sm" | "md" | "lg";
}

const statusVariants: Record<
  BookingStatus | JobRequestStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  Requested: {
    variant: "secondary",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  Accepted: {
    variant: "secondary",
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  },
  InProgress: {
    variant: "secondary",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
  Completed: {
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  Disputed: { variant: "destructive", className: "" },
  PendingAiReview: {
    variant: "secondary",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  Open: {
    variant: "secondary",
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  },
  Cancelled: { variant: "outline", className: "text-muted-foreground" },
};

const statusLabel: Record<string, string> = {
  ...BOOKING_STATUS_LABELS,
  ...JOB_REQUEST_STATUS_LABELS,
};

export default function BookingStatusBadge({ status, size = "md" }: BookingStatusBadgeProps) {
  const config = statusVariants[status] ?? {
    variant: "outline" as const,
    className: "text-muted-foreground",
  };
  const label = statusLabel[status] ?? status;

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
      {label}
    </Badge>
  );
}
