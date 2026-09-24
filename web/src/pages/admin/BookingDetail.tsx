import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { bookingApi } from "../../api/bookings";
import type { BookingResponseDto } from "../../api/types";
import { extractApiError } from "../../lib/api";
import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import BookingStatusControl from "../../components/booking/BookingStatusControl";
import LoadError from "../../components/booking/LoadError";
import {
  formatDateTime,
  formatMoney,
  fromDateTimeLocalValue,
  shortId,
  toDateTimeLocalValue,
} from "../../components/booking/format";
import { getHttpStatus, retryUnlessClientError } from "../../components/booking/httpStatus";
import "./ProviderDirectory.css";
import "./VerificationQueue.css";
import "./BookingAdmin.css";

function ScheduleEditor({ booking }: { booking: BookingResponseDto }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(() => toDateTimeLocalValue(booking.scheduledAt));

  const mutation = useMutation({
    mutationFn: (scheduledAt: string | null) =>
      bookingApi.updateSchedule(booking.id, { scheduledAt }),
    // Same reason as the status control: the PUT response lacks the joined
    // fields, so refetch instead of caching it.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  return (
    <div className="booking-schedule-editor">
      <input
        type="datetime-local"
        aria-label="Scheduled date and time"
        value={value}
        disabled={mutation.isPending}
        onChange={(e) => {
          mutation.reset();
          setValue(e.target.value);
        }}
      />
      <button
        type="button"
        className="table-action-btn"
        disabled={!value || mutation.isPending}
        onClick={() => mutation.mutate(fromDateTimeLocalValue(value))}
      >
        {mutation.isPending ? "Saving…" : "Save schedule"}
      </button>
      <button
        type="button"
        className="table-action-btn"
        disabled={!booking.scheduledAt || mutation.isPending}
        onClick={() => {
          setValue("");
          mutation.mutate(null);
        }}
      >
        Clear
      </button>
      {mutation.isError && (
        <div role="alert" className="booking-inline-error">
          {extractApiError(mutation.error, "Schedule update failed.")}
        </div>
      )}
      {mutation.isSuccess && <div className="booking-success">Schedule saved.</div>}
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();

  const {
    data: booking,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["bookings", "detail", id],
    queryFn: () => bookingApi.getById(id!),
    enabled: !!id,
    retry: retryUnlessClientError,
  });

  const backLink = (
    <Link to="/admin/bookings" className="booking-back-link">
      <ArrowLeft size={16} /> Back to Bookings
    </Link>
  );

  if (isLoading)
    return <div style={{ padding: "4rem", textAlign: "center" }}>Loading booking...</div>;

  if (isError && getHttpStatus(error) === 404)
    return (
      <div className="admin-page-container">
        {backLink}
        <div className="booking-state">Booking not found.</div>
      </div>
    );

  if (isError || !booking)
    return (
      <div className="admin-page-container">
        {backLink}
        <LoadError title="Couldn't load this booking" error={error} onRetry={() => refetch()} />
      </div>
    );

  return (
    <div className="admin-page-container animate-fade-up">
      {backLink}

      <header className="admin-header">
        <div>
          <div className="booking-title-row">
            <h1 className="admin-title">Booking {shortId(booking.id)}</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="admin-subtitle booking-mono">{booking.id}</p>
        </div>
      </header>

      <div className="booking-detail-grid">
        <section className="booking-card">
          <h2>Manage</h2>
          <div className="booking-manage-row">
            <span className="booking-manage-label">Status</span>
            <BookingStatusControl
              bookingId={booking.id}
              status={booking.status}
              label="this booking"
            />
          </div>
          <div className="booking-manage-row">
            <span className="booking-manage-label">
              Scheduled for: {formatDateTime(booking.scheduledAt, "Not scheduled")}
            </span>
            <ScheduleEditor booking={booking} />
          </div>
        </section>

        <section className="booking-card">
          <h2>People</h2>
          <dl className="booking-fields">
            <dt>Customer</dt>
            <dd>{booking.customerName ?? "—"}</dd>
            <dt>Customer phone</dt>
            <dd>{booking.customerPhone ?? "—"}</dd>
            <dt>Customer ID</dt>
            <dd className="booking-mono">{booking.customerId}</dd>
            <dt>Provider</dt>
            <dd>{booking.providerName ?? "—"}</dd>
            <dt>Provider ID</dt>
            <dd className="booking-mono">{booking.providerId}</dd>
          </dl>
        </section>

        <section className="booking-card">
          <h2>Service</h2>
          <dl className="booking-fields">
            <dt>Category</dt>
            <dd>{booking.category ?? "—"}</dd>
            <dt>Location</dt>
            <dd>{booking.serviceLocation ?? "—"}</dd>
            <dt>Price</dt>
            <dd>{formatMoney(booking.price)}</dd>
            <dt>Job request</dt>
            <dd>
              {booking.jobRequestId ? (
                <Link to={`/admin/job-requests/${booking.jobRequestId}`} className="booking-mono">
                  {booking.jobRequestId}
                </Link>
              ) : (
                "—"
              )}
            </dd>
            <dt>Service listing</dt>
            <dd className="booking-mono">{booking.serviceListingId ?? "—"}</dd>
          </dl>
        </section>

        <section className="booking-card">
          <h2>Timeline</h2>
          <dl className="booking-fields">
            <dt>Created</dt>
            <dd>{formatDateTime(booking.createdAt)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDateTime(booking.updatedAt, "Never")}</dd>
            <dt>Scheduled</dt>
            <dd>{formatDateTime(booking.scheduledAt, "Not scheduled")}</dd>
          </dl>
        </section>

        {booking.description && (
          <section className="booking-card" style={{ gridColumn: "1 / -1" }}>
            <h2>Job description</h2>
            <p className="booking-description">{booking.description}</p>
          </section>
        )}
      </div>
    </div>
  );
}
