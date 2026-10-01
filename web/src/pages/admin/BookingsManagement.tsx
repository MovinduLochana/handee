import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarCheck, Eye, Search } from "lucide-react";
import { bookingApi, BOOKING_STATUSES, BOOKING_STATUS_LABELS } from "../../api/bookings";
import type { BookingResponseDto, BookingStatus } from "../../api/types";
import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import BookingStatusControl from "../../components/booking/BookingStatusControl";
import LoadError from "../../components/booking/LoadError";
import SortableHeader from "../../components/booking/SortableHeader";
import { nextSort, sortRows, type SortState } from "../../components/booking/tableSort";
import { shortId } from "../../components/booking/format";
import EmptyState from "../../components/provider/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortKey = "id" | "providerId" | "customerId" | "status" | "scheduledAt" | "createdAt";
type ClientSortKey = Exclude<SortKey, "createdAt">;

const PAGE_SIZE = 20;

function sortValue(booking: BookingResponseDto, key: ClientSortKey): string | number | null {
  if (key === "status") return BOOKING_STATUSES.indexOf(booking.status);
  if (key === "scheduledAt") return booking.scheduledAt ? Date.parse(booking.scheduledAt) : null;
  return booking[key];
}

function parseStatus(value: string | null): BookingStatus | "" {
  return BOOKING_STATUSES.find((s) => s === value) ?? "";
}

export default function BookingsManagement() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BookingStatus | "">(() =>
    parseStatus(searchParams.get("status")),
  );
  const [search, setSearch] = useState("");
  // createdAt is the only ordering the API supports, so it's applied
  // server-side across all pages; other columns sort the loaded page.
  const [serverDescending, setServerDescending] = useState(true);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "createdAt", direction: "desc" });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["bookings", "staff", { status, serverDescending, page }],
    queryFn: () =>
      bookingApi.getForStaff({
        status: status || undefined,
        sortDescending: serverDescending,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const handleSort = (key: SortKey) => {
    if (key === "createdAt") {
      const descending = sort.key === "createdAt" ? !serverDescending : true;
      setServerDescending(descending);
      setSort({ key, direction: descending ? "desc" : "asc" });
      setPage(1);
    } else {
      setSort(nextSort(sort, key));
    }
  };

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const term = search.trim().toLowerCase();
  const matching = term
    ? items.filter((b) =>
        [b.id, b.providerId, b.customerId].some((v) => v.toLowerCase().includes(term)),
      )
    : items;
  const clientKey = sort.key === "createdAt" ? null : sort.key;
  const rows = clientKey
    ? sortRows(matching, sort.direction, (b) => sortValue(b, clientKey))
    : matching;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bookings</h1>
        <p className="text-muted-foreground text-sm">
          Every booking on the platform, with quick status changes.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="booking-search" className="text-xs font-semibold text-muted-foreground">
            Search this page
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="booking-search"
              type="text"
              className="pl-9 h-9 text-xs"
              placeholder="Booking, provider or customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full sm:w-56 space-y-1.5">
          <label htmlFor="booking-status" className="text-xs font-semibold text-muted-foreground">
            Status
          </label>
          <select
            id="booking-status"
            className="w-full h-9 rounded border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as BookingStatus | "");
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Status filters all bookings. Search, and sorting by any column except Created, apply to the
        current page only. Status changes only offer transitions the backend allows.
      </p>

      {isError ? (
        <LoadError title="Couldn't load bookings" error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            Loading bookings...
          </CardContent>
        </Card>
      ) : totalCount === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={28} />}
          title="No bookings found"
          description={
            status
              ? `No bookings are currently ${BOOKING_STATUS_LABELS[status]}.`
              : "No bookings have been created yet."
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Booking" sortKey="id" sort={sort} onSort={handleSort} />
                  <SortableHeader
                    label="Provider"
                    sortKey="providerId"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Customer"
                    sortKey="customerId"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader label="Status" sortKey="status" sort={sort} onSort={handleSort} />
                  <SortableHeader
                    label="Scheduled"
                    sortKey="scheduledAt"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Created"
                    sortKey="createdAt"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center p-8 text-muted-foreground text-sm"
                    >
                      No bookings on this page match "{search.trim()}".
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <span
                          className="font-mono text-xs font-medium text-foreground"
                          title={booking.id}
                        >
                          {shortId(booking.id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-mono text-xs text-muted-foreground"
                          title={booking.providerId}
                        >
                          {shortId(booking.providerId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-mono text-xs text-muted-foreground"
                          title={booking.customerId}
                        >
                          {shortId(booking.customerId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <BookingStatusBadge status={booking.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-xs">
                        {booking.scheduledAt ? (
                          new Date(booking.scheduledAt).toLocaleString()
                        ) : (
                          <span className="text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <BookingStatusControl
                            bookingId={booking.id}
                            status={booking.status}
                            label={`booking ${shortId(booking.id)}`}
                          />
                          <Link
                            to={`/admin/bookings/${booking.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
              <div>
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, totalCount)} of{" "}
                {totalCount} bookings
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <div className="px-2 font-medium text-foreground">
                  {page} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
