import type { VerificationStatus, DocumentReviewStatus } from "../../api/types";
import "./StatusBadge.css";

interface StatusBadgeProps {
  status: VerificationStatus | DocumentReviewStatus;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  Pending: { label: "Pending", className: "badge-pending" },
  InReview: { label: "In Review", className: "badge-review" },
  Verified: { label: "Verified", className: "badge-verified" },
  Approved: { label: "Approved", className: "badge-verified" },
  Rejected: { label: "Rejected", className: "badge-rejected" },
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: "badge-pending" };

  return (
    <span className={`status-badge status-badge-${size} ${config.className}`}>
      <span className="badge-dot" />
      {config.label}
    </span>
  );
}
