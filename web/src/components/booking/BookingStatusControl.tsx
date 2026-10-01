import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingApi, BOOKING_STATUS_LABELS, getLegalTransitions } from "../../api/bookings";
import type { BookingStatus } from "../../api/types";
import { extractApiError } from "../../lib/api";
import { Button } from "@/components/ui/button";

interface BookingStatusControlProps {
  bookingId: string;
  status: BookingStatus;
  /** Used in the accessible name so rows in a table are distinguishable. */
  label?: string;
}

/**
 * Offers only the transitions BookingService.LegalTransitions accepts from
 * the current status, so the UI can't propose a change the backend rejects.
 */
export default function BookingStatusControl({
  bookingId,
  status,
  label = "booking",
}: BookingStatusControlProps) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<BookingStatus | "">("");
  const options = getLegalTransitions(status);

  const mutation = useMutation({
    mutationFn: (next: BookingStatus) => bookingApi.updateStatus(bookingId, { status: next }),
    onSuccess: () => {
      setTarget("");
      // The PUT response has no customer/provider/job-request fields, so
      // refetch everything booking-related instead of caching that response.
      return queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  return (
    <div className="booking-status-control flex items-center gap-1.5 flex-wrap">
      <select
        aria-label={`Change status of ${label}`}
        value={target}
        disabled={mutation.isPending}
        className="h-8 border border-input bg-background px-2.5 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        onChange={(e) => {
          mutation.reset();
          setTarget(e.target.value as BookingStatus | "");
        }}
      >
        <option value="">Move to…</option>
        {options.map((s) => (
          <option key={s} value={s}>
            {BOOKING_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="default"
        className="table-action-btn h-8 text-xs px-2.5"
        disabled={!target || mutation.isPending}
        onClick={() => target && mutation.mutate(target)}
      >
        {mutation.isPending ? "Saving…" : "Apply"}
      </Button>
      {mutation.isError && (
        <div
          role="alert"
          className="booking-inline-error w-full text-xs text-destructive font-medium mt-1"
        >
          {extractApiError(mutation.error, "Status update failed.")}
        </div>
      )}
    </div>
  );
}
