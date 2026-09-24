import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingApi, BOOKING_STATUS_LABELS, getLegalTransitions } from "../../api/bookings";
import type { BookingStatus } from "../../api/types";
import { extractApiError } from "../../lib/api";
import "./BookingComponents.css";

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
    <div className="booking-status-control">
      <select
        aria-label={`Change status of ${label}`}
        value={target}
        disabled={mutation.isPending}
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
      <button
        type="button"
        className="table-action-btn"
        disabled={!target || mutation.isPending}
        onClick={() => target && mutation.mutate(target)}
      >
        {mutation.isPending ? "Saving…" : "Apply"}
      </button>
      {mutation.isError && (
        <div role="alert" className="booking-inline-error">
          {extractApiError(mutation.error, "Status update failed.")}
        </div>
      )}
    </div>
  );
}
