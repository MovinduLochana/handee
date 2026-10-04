import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Zap, Receipt } from "lucide-react";
import { bookingApi } from "../../api/bookings";
import { paymentsApi } from "../../api/payments";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ScheduleEditor({ booking }: { booking: BookingResponseDto }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(() => toDateTimeLocalValue(booking.scheduledAt));

  const mutation = useMutation({
    mutationFn: (scheduledAt: string | null) =>
      bookingApi.updateSchedule(booking.id, { scheduledAt }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="datetime-local"
        aria-label="Scheduled date and time"
        value={value}
        disabled={mutation.isPending}
        className="w-auto h-8 text-xs"
        onChange={(e) => {
          mutation.reset();
          setValue(e.target.value);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!value || mutation.isPending}
        onClick={() => mutation.mutate(fromDateTimeLocalValue(value))}
        className="h-8 text-xs"
      >
        {mutation.isPending ? "Saving…" : "Save schedule"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!booking.scheduledAt || mutation.isPending}
        onClick={() => {
          setValue("");
          mutation.mutate(null);
        }}
        className="h-8 text-xs text-muted-foreground hover:text-foreground"
      >
        Clear
      </Button>
      {mutation.isError && (
        <div role="alert" className="text-xs text-destructive font-medium w-full mt-1">
          {extractApiError(mutation.error, "Schedule update failed.")}
        </div>
      )}
      {mutation.isSuccess && (
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium w-full mt-1">
          Schedule saved.
        </div>
      )}
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

  const { data: invoice } = useQuery({
    queryKey: ["bookingInvoice", id],
    queryFn: () => paymentsApi.getInvoiceByBookingId(id!),
    enabled: !!id,
    retry: 1,
  });

  const backLink = (
    <Link to="/admin/bookings" className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Bookings
    </Link>
  );

  if (isLoading)
    return <div className="p-16 text-center text-muted-foreground text-sm">Loading booking...</div>;

  if (isError && getHttpStatus(error) === 404)
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {backLink}
        <div className="text-muted-foreground text-sm">Booking not found.</div>
      </div>
    );

  if (isError || !booking)
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {backLink}
        <LoadError title="Couldn't load this booking" error={error} onRetry={() => refetch()} />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {backLink}

      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Booking {shortId(booking.id)}
          </h1>
          <BookingStatusBadge status={booking.status} />
        </div>
        <p className="text-xs font-mono text-muted-foreground">{booking.id}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Manage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground">Status</span>
              <BookingStatusControl
                bookingId={booking.id}
                status={booking.status}
                label="this booking"
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground block">
                Scheduled for: {formatDateTime(booking.scheduledAt, "Not scheduled")}
              </span>
              <ScheduleEditor booking={booking} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">People</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-semibold text-foreground">{booking.customerName ?? "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Customer phone:</span>
              <span className="text-foreground">{booking.customerPhone ?? "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Customer ID:</span>
              <span className="font-mono text-foreground">{booking.customerId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-semibold text-foreground">{booking.providerName ?? "—"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Provider ID:</span>
              <span className="font-mono text-foreground">{booking.providerId}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-semibold text-foreground">{booking.category ?? "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Location:</span>
              <span className="text-foreground">{booking.serviceLocation ?? "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-semibold text-foreground">{formatMoney(booking.price)}</span>
            </div>
            {invoice && (
              <div className="py-2 border-b border-border bg-muted/20 px-2 rounded space-y-1.5 my-1">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1">
                    <Receipt className="h-3 w-3 text-primary" /> Invoice Breakdown:
                  </span>
                  <Link
                    to={`/invoices/${invoice.id}`}
                    className="text-[11px] text-primary hover:underline font-mono"
                  >
                    #{invoice.id.slice(0, 8)}
                  </Link>
                </div>
                {(() => {
                  let items: Array<{ item: string; price: number; type?: string }> = [];
                  if (invoice.lineItemsJson) {
                    try {
                      const parsed = JSON.parse(invoice.lineItemsJson);
                      if (Array.isArray(parsed)) items = parsed;
                    } catch {}
                  }
                  if (items.length === 0) {
                    items = [
                      { item: "Service Labor (85%)", price: invoice.baseAmount, type: "Labor" },
                      { item: "Platform Trust Fee (15%)", price: invoice.platformFee, type: "Fee" },
                    ];
                  }
                  return items.map((line, idx) => {
                    const isUrgency =
                      line.type?.toLowerCase() === "urgency" ||
                      line.item.toLowerCase().includes("priority") ||
                      line.item.toLowerCase().includes("surcharge");
                    return (
                      <div
                        key={idx}
                        className={`flex justify-between text-[11px] ${
                          isUrgency
                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {isUrgency && <Zap className="h-2.5 w-2.5 fill-current" />}
                          {line.item}
                        </span>
                        <span>
                          {isUrgency && line.price > 0 ? "+" : ""}
                          {formatMoney(line.price)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Job request:</span>
              <span>
                {booking.jobRequestId ? (
                  <Link
                    to={`/admin/job-requests/${booking.jobRequestId}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {booking.jobRequestId}
                  </Link>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Service listing:</span>
              <span className="font-mono text-foreground">{booking.serviceListingId ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Created:</span>
              <span className="text-foreground">{formatDateTime(booking.createdAt)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Last updated:</span>
              <span className="text-foreground">{formatDateTime(booking.updatedAt, "Never")}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Scheduled:</span>
              <span className="text-foreground">
                {formatDateTime(booking.scheduledAt, "Not scheduled")}
              </span>
            </div>
          </CardContent>
        </Card>

        {booking.description && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Job description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {booking.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
