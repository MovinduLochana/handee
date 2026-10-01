import { AlertTriangle, RefreshCw } from "lucide-react";
import { extractApiError } from "../../lib/api";
import { getHttpStatus } from "./httpStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
    <Alert
      variant="destructive"
      className="booking-error-banner flex items-start justify-between gap-4 p-4 my-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="booking-error-text space-y-1">
          <AlertTitle className="font-semibold">{title}</AlertTitle>
          <AlertDescription className="text-sm">{message}</AlertDescription>
        </div>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="page-btn shrink-0 flex items-center gap-1.5 h-8"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </Alert>
  );
}
