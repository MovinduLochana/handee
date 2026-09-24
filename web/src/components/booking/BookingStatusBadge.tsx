import type { BookingStatus, JobRequestStatus } from "../../api/types";
import { BOOKING_STATUS_LABELS } from "../../api/bookings";
import { JOB_REQUEST_STATUS_LABELS } from "../../api/jobRequests";
import "../provider/StatusBadge.css";
import "./BookingComponents.css";

interface BookingStatusBadgeProps {
  status: BookingStatus | JobRequestStatus;
  size?: "sm" | "md" | "lg";
}

// The two enums share no member names, so one map covers both.
const statusClass: Record<BookingStatus | JobRequestStatus, string> = {
  Requested: "badge-pending",
  Accepted: "badge-review",
  InProgress: "badge-progress",
  Completed: "badge-verified",
  Disputed: "badge-rejected",
  PendingAiReview: "badge-pending",
  Open: "badge-review",
  Cancelled: "badge-neutral",
};

const statusLabel: Record<string, string> = {
  ...BOOKING_STATUS_LABELS,
  ...JOB_REQUEST_STATUS_LABELS,
};

export default function BookingStatusBadge({ status, size = "md" }: BookingStatusBadgeProps) {
  // Fall back to the raw value rather than hiding a status the UI doesn't know yet.
  const className = statusClass[status] ?? "badge-neutral";
  const label = statusLabel[status] ?? status;

  return (
    <span className={`status-badge status-badge-${size} ${className}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}
