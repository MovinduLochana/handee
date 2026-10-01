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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortKey = "categoryName" | "location" | "urgency" | "status" | "customerId" | "createdAt";
type ClientSortKey = Exclude<SortKey, "createdAt">;

const PAGE_SIZE = 20;

function sortValue(job: JobRequestResponseDto, key: ClientSortKey): string | number {
  if (key === "urgency") return JOB_URGENCIES.indexOf(job.urgency);
  if (key === "status") return JOB_REQUEST_STATUSES.indexOf(job.status);
  return job[key];
}

function parseStatus(value: string | null): JobRequestStatus | "" {
  return JOB_REQUEST_STATUSES.find((s) => s === value) ?? "";
}

function getUrgencyBadge(urgency: JobUrgency) {
  switch (urgency) {
    case "Emergency":
      return (
        <Badge variant="destructive" className="text-xs">
          {urgency}
        </Badge>
      );
    case "High":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs"
        >
          {urgency}
        </Badge>
      );
    case "Medium":
      return (
        <Badge
          variant="outline"
          className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs"
        >
          {urgency}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          {urgency}
        </Badge>
      );
  }
}

export default function JobRequestsManagement() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<JobRequestStatus | "">(() =>
    parseStatus(searchParams.get("status")),
  );
  const [urgency, setUrgency] = useState<JobUrgency | "">("");
  const [search, setSearch] = useState("");
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Job Requests</h1>
        <p className="text-muted-foreground text-sm">Every customer job request on the platform.</p>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="job-search" className="text-xs font-semibold text-muted-foreground">
            Search this page
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="job-search"
              type="text"
              className="pl-9 h-9 text-xs"
              placeholder="Category, location or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full sm:w-48 space-y-1.5">
          <label htmlFor="job-status" className="text-xs font-semibold text-muted-foreground">
            Status
          </label>
          <select
            id="job-status"
            className="w-full h-9 rounded border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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

        <div className="w-full sm:w-44 space-y-1.5">
          <label htmlFor="job-urgency" className="text-xs font-semibold text-muted-foreground">
            Urgency
          </label>
          <select
            id="job-urgency"
            className="w-full h-9 rounded border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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

      <p className="text-xs text-muted-foreground">
        Status and urgency filter all job requests. Search, and sorting by any column except
        Submitted, apply to the current page only.
      </p>

      {isError ? (
        <LoadError title="Couldn't load job requests" error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            Loading job requests...
          </CardContent>
        </Card>
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                      No job requests on this page match "{search.trim()}".
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-semibold text-foreground text-sm">
                        {job.categoryName}
                      </TableCell>
                      <TableCell className="text-xs">{job.location}</TableCell>
                      <TableCell>{getUrgencyBadge(job.urgency)}</TableCell>
                      <TableCell>
                        <BookingStatusBadge status={job.status} size="sm" />
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-mono text-xs text-muted-foreground"
                          title={job.customerId}
                        >
                          {shortId(job.customerId)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/admin/job-requests/${job.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Link>
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
                {totalCount} job requests
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
