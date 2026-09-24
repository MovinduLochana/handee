import { AlertTriangle, RefreshCw } from "lucide-react";
import { extractApiError } from "../../lib/api";
import { getHttpStatus } from "./httpStatus";
import "./BookingComponents.css";

interface LoadErrorProps {
  title: string;
  error: unknown;
  onRetry?: () => void;
}

export default function LoadError({ title, error, onRetry }: LoadErrorProps) {
  // Admin routes have no client-side role guard (the API enforces roles), so a
  // non-admin who lands here gets a bare 403 — say what it means.
  const message =
    getHttpStatus(error) === 403
      ? "You need an Admin account to view this."
      : extractApiError(error, "Something went wrong while contacting the server.");

  return (
    <div className="booking-error-banner" role="alert">
      <AlertTriangle size={18} />
      <div className="booking-error-text">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button type="button" className="page-btn" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}
