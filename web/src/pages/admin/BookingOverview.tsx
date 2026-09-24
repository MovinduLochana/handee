import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { bookingApi, BOOKING_STATUSES } from "../../api/bookings";
import { jobRequestApi, JOB_REQUEST_STATUSES } from "../../api/jobRequests";
import type { BookingStatus, JobRequestStatus } from "../../api/types";
import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import LoadError from "../../components/booking/LoadError";
import EmptyState from "../../components/provider/EmptyState";
import "./VerificationQueue.css";
import "./BookingAdmin.css";

interface CountCard<S extends string> {
  status: S;
  count: number;
}

function CountSection<S extends BookingStatus | JobRequestStatus>({
  title,
  cards,
  listPath,
}: {
  title: string;
  cards: CountCard<S>[];
  listPath: string;
}) {
  const total = cards.reduce((sum, c) => sum + c.count, 0);
  return (
    <section className="booking-overview-section">
      <h2>
        {title} <span className="booking-overview-total">{total} total</span>
      </h2>
      <div className="booking-count-grid">
        {cards.map((c) => (
          <Link
            key={c.status}
            to={`${listPath}?status=${c.status}`}
            className="booking-count-card hover-lift"
          >
            <BookingStatusBadge status={c.status} size="sm" />
            <span className="booking-count-value">{c.count}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function BookingOverview() {
  // No summary endpoint exists for bookings or job requests, so each count
  // is the totalCount of a one-item page of the real staff list endpoint.
  const jobCounts = useQueries({
    queries: JOB_REQUEST_STATUSES.map((status) => ({
      queryKey: ["jobRequests", "count", status],
      queryFn: () =>
        jobRequestApi.getForStaff({ status, page: 1, pageSize: 1 }).then((r) => r.totalCount),
    })),
  });

  const bookingCounts = useQueries({
    queries: BOOKING_STATUSES.map((status) => ({
      queryKey: ["bookings", "count", status],
      queryFn: () =>
        bookingApi.getForStaff({ status, page: 1, pageSize: 1 }).then((r) => r.totalCount),
    })),
  });

  const all = [...jobCounts, ...bookingCounts];
  const failed = all.find((q) => q.isError);

  const header = (
    <header className="admin-header">
      <div>
        <h1 className="admin-title">Booking Overview</h1>
        <p className="admin-subtitle">Job requests and bookings by status.</p>
      </div>
    </header>
  );

  if (failed)
    return (
      <div className="admin-page-container animate-fade-up">
        {header}
        <LoadError
          title="Couldn't load booking counts"
          error={failed.error}
          onRetry={() => all.filter((q) => q.isError).forEach((q) => q.refetch())}
        />
      </div>
    );

  if (all.some((q) => q.isLoading))
    return (
      <div className="admin-page-container animate-fade-up">
        {header}
        <div className="booking-state">Loading overview...</div>
      </div>
    );

  const jobCards = JOB_REQUEST_STATUSES.map((status, i) => ({
    status,
    count: jobCounts[i].data ?? 0,
  }));
  const bookingCards = BOOKING_STATUSES.map((status, i) => ({
    status,
    count: bookingCounts[i].data ?? 0,
  }));
  const grandTotal = [...jobCards, ...bookingCards].reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="admin-page-container animate-fade-up">
      {header}

      {grandTotal === 0 ? (
        <EmptyState
          icon={<LayoutDashboard size={28} />}
          title="Nothing to show yet"
          description="No job requests or bookings exist on the platform yet."
        />
      ) : (
        <>
          <CountSection title="Job Requests" cards={jobCards} listPath="/admin/job-requests" />
          <CountSection title="Bookings" cards={bookingCards} listPath="/admin/bookings" />
          <p className="booking-scope-note" style={{ margin: 0 }}>
            Counts come from each status's filtered staff list (one request per status). There's no
            aggregate endpoint yet.
          </p>
        </>
      )}
    </div>
  );
}
