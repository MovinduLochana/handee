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
import "./ProviderDirectory.css";
import "./VerificationQueue.css";
import "./BookingAdmin.css";

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
    <div className="directory-container animate-fade-up">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Bookings</h1>
          <p className="admin-subtitle">
            Every booking on the platform, with quick status changes.
          </p>
        </div>
      </header>

      <div className="directory-toolbar">
        <div className="filter-group">
          <label htmlFor="booking-search">Search this page</label>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 12, top: 13, color: "var(--text-muted)" }}
            />
            <input
              id="booking-search"
              type="text"
              className="filter-input"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Booking, provider or customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="booking-status">Status</label>
          <select
            id="booking-status"
            className="filter-input"
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

      <p className="booking-scope-note">
        Status filters all bookings. Search, and sorting by any column except Created, apply to the
        current page only. Status changes only offer transitions the backend allows.
      </p>

      {isError ? (
        <LoadError title="Couldn't load bookings" error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="directory-table-card">
          <div className="booking-state">Loading bookings...</div>
        </div>
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
        <div className="directory-table-card">
          <div className="booking-table-scroll">
            <table className="directory-table">
              <thead>
                <tr>
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
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="booking-state">
                      No bookings on this page match "{search.trim()}".
                    </td>
                  </tr>
                ) : (
                  rows.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <span className="booking-mono" title={booking.id}>
                          {shortId(booking.id)}
                        </span>
                      </td>
                      <td>
                        <span className="booking-mono" title={booking.providerId}>
                          {shortId(booking.providerId)}
                        </span>
                      </td>
                      <td>
                        <span className="booking-mono" title={booking.customerId}>
                          {shortId(booking.customerId)}
                        </span>
                      </td>
                      <td>
                        <BookingStatusBadge status={booking.status} size="sm" />
                      </td>
                      <td>
                        {booking.scheduledAt ? (
                          new Date(booking.scheduledAt).toLocaleString()
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>Not scheduled</span>
                        )}
                      </td>
                      <td>{new Date(booking.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="booking-row-actions">
                          <BookingStatusControl
                            bookingId={booking.id}
                            status={booking.status}
                            label={`booking ${shortId(booking.id)}`}
                          />
                          <Link to={`/admin/bookings/${booking.id}`} className="table-action-btn">
                            <Eye size={14} /> View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="directory-pagination">
              <div className="pagination-info">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, totalCount)} of{" "}
                {totalCount} bookings
              </div>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 0.5rem",
                    fontWeight: 600,
                  }}
                >
                  {page} / {totalPages}
                </div>
                <button
                  className="page-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
