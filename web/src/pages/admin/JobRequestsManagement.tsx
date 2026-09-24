import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ClipboardList, Eye, Search } from "lucide-react";
import {
  jobRequestApi,
  JOB_REQUEST_STATUSES,
  JOB_REQUEST_STATUS_LABELS,
  JOB_URGENCIES,
} from "../../api/jobRequests";
import type { JobRequestResponseDto, JobRequestStatus, JobUrgency } from "../../api/types";
import BookingStatusBadge from "../../components/booking/BookingStatusBadge";
import LoadError from "../../components/booking/LoadError";
import SortableHeader from "../../components/booking/SortableHeader";
import { nextSort, sortRows, type SortState } from "../../components/booking/tableSort";
import { shortId } from "../../components/booking/format";
import EmptyState from "../../components/provider/EmptyState";
import "./ProviderDirectory.css";
import "./VerificationQueue.css";
import "./BookingAdmin.css";

type SortKey = "categoryName" | "location" | "urgency" | "status" | "customerId" | "createdAt";
type ClientSortKey = Exclude<SortKey, "createdAt">;

const PAGE_SIZE = 20;

function sortValue(job: JobRequestResponseDto, key: ClientSortKey): string | number {
  // Enum columns sort by enum order (e.g. Low → Emergency), not alphabetically.
  if (key === "urgency") return JOB_URGENCIES.indexOf(job.urgency);
  if (key === "status") return JOB_REQUEST_STATUSES.indexOf(job.status);
  return job[key];
}

function parseStatus(value: string | null): JobRequestStatus | "" {
  return JOB_REQUEST_STATUSES.find((s) => s === value) ?? "";
}

export default function JobRequestsManagement() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<JobRequestStatus | "">(() =>
    parseStatus(searchParams.get("status")),
  );
  const [urgency, setUrgency] = useState<JobUrgency | "">("");
  const [search, setSearch] = useState("");
  // createdAt is the only ordering the API supports, so it's applied
  // server-side across all pages; other columns sort the loaded page.
  const [serverDescending, setServerDescending] = useState(true);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "createdAt", direction: "desc" });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["jobRequests", "staff", { status, urgency, serverDescending, page }],
    queryFn: () =>
      jobRequestApi.getForStaff({
        status: status || undefined,
        urgency: urgency || undefined,
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
    ? items.filter((j) =>
        [j.categoryName, j.location, j.customerId, j.id].some((v) =>
          v.toLowerCase().includes(term),
        ),
      )
    : items;
  const clientKey = sort.key === "createdAt" ? null : sort.key;
  const rows = clientKey
    ? sortRows(matching, sort.direction, (j) => sortValue(j, clientKey))
    : matching;

  const isFiltered = status !== "" || urgency !== "";

  return (
    <div className="directory-container animate-fade-up">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Job Requests</h1>
          <p className="admin-subtitle">Every customer job request on the platform.</p>
        </div>
      </header>

      <div className="directory-toolbar">
        <div className="filter-group">
          <label htmlFor="job-search">Search this page</label>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 12, top: 13, color: "var(--text-muted)" }}
            />
            <input
              id="job-search"
              type="text"
              className="filter-input"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Category, location or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="job-status">Status</label>
          <select
            id="job-status"
            className="filter-input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as JobRequestStatus | "");
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {JOB_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {JOB_REQUEST_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="job-urgency">Urgency</label>
          <select
            id="job-urgency"
            className="filter-input"
            value={urgency}
            onChange={(e) => {
              setUrgency(e.target.value as JobUrgency | "");
              setPage(1);
            }}
          >
            <option value="">All Urgencies</option>
            {JOB_URGENCIES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="booking-scope-note">
        Status and urgency filter all job requests. Search, and sorting by any column except
        Submitted, apply to the current page only.
      </p>

      {isError ? (
        <LoadError title="Couldn't load job requests" error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="directory-table-card">
          <div className="booking-state">Loading job requests...</div>
        </div>
      ) : totalCount === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="No job requests found"
          description={
            isFiltered
              ? "No job requests match this status and urgency."
              : "Customers haven't submitted any job requests yet."
          }
        />
      ) : (
        <div className="directory-table-card">
          <div className="booking-table-scroll">
            <table className="directory-table">
              <thead>
                <tr>
                  <SortableHeader
                    label="Category"
                    sortKey="categoryName"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Location"
                    sortKey="location"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Urgency"
                    sortKey="urgency"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader label="Status" sortKey="status" sort={sort} onSort={handleSort} />
                  <SortableHeader
                    label="Customer"
                    sortKey="customerId"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Submitted"
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
                      No job requests on this page match "{search.trim()}".
                    </td>
                  </tr>
                ) : (
                  rows.map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontWeight: 600, color: "var(--text-h)" }}>
                        {job.categoryName}
                      </td>
                      <td>{job.location}</td>
                      <td>
                        <span className={`booking-urgency-${job.urgency.toLowerCase()}`}>
                          {job.urgency}
                        </span>
                      </td>
                      <td>
                        <BookingStatusBadge status={job.status} size="sm" />
                      </td>
                      <td>
                        <span className="booking-mono" title={job.customerId}>
                          {shortId(job.customerId)}
                        </span>
                      </td>
                      <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link to={`/admin/job-requests/${job.id}`} className="table-action-btn">
                          <Eye size={14} /> View
                        </Link>
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
                {totalCount} job requests
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
