import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { bookingApi, BOOKING_STATUSES } from "../../api/bookings";
import { jobRequestApi, JOB_REQUEST_STATUSES } from "../../api/jobRequests";
import type { BookingStatus, JobRequestStatus } from "../../api/types";
import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import LoadError from "../../components/booking/LoadError";
import EmptyState from "../../components/provider/EmptyState";
import { Card, CardContent } from "@/components/ui/card";

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
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {total} total
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Link key={c.status} to={`${listPath}?status=${c.status}`} className="group">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <BookingStatusBadge status={c.status} size="sm" />
                <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {c.count}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function BookingOverview() {
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
    <header className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Booking Overview</h1>
      <p className="text-muted-foreground text-sm">Job requests and bookings by status.</p>
    </header>
  );

  if (failed)
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {header}
        <div className="text-muted-foreground text-sm">Loading overview...</div>
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
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
          <p className="text-xs text-muted-foreground">
            Counts come from each status's filtered staff list (one request per status). There's no
            aggregate endpoint yet.
          </p>
        </>
      )}
    </div>
  );
}
