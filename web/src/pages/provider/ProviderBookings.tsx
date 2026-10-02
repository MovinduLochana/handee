import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HubConnectionBuilder } from "@microsoft/signalr";
import {
  CalendarCheck,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  Inbox,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { bookingApi } from "../../api/bookings";
import type { BookingResponseDto } from "../../api/types";
import { BASE_URL } from "../../lib/api";
import { getAccessToken } from "../../lib/tokenManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import BookingStatusBadge from "../../components/booking/BookingStatusBadge";

export default function ProviderBookings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("requests");
  const [declineItem, setDeclineItem] = useState<BookingResponseDto | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("");

  // Queries
  const {
    data: requests = [],
    isLoading: loadingRequests,
    error: requestsError,
  } = useQuery({
    queryKey: ["providerScheduledRequests"],
    queryFn: bookingApi.getProviderScheduledRequests,
  });

  const {
    data: allBookings = [],
    isLoading: loadingBookings,
    error: bookingsError,
  } = useQuery({
    queryKey: ["providerBookings"],
    queryFn: bookingApi.getProviderBookings,
  });

  // Filter confirmed / active / completed bookings (non-requested)
  const confirmedBookings = allBookings.filter(
    (b) => b.status !== "Requested" && b.status !== "Declined" && b.status !== "Expired",
  );

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: (id: string) => bookingApi.confirmBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerScheduledRequests"] });
      queryClient.invalidateQueries({ queryKey: ["providerBookings"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bookingApi.declineBooking(id, reason),
    onSuccess: () => {
      setDeclineItem(null);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["providerScheduledRequests"] });
      queryClient.invalidateQueries({ queryKey: ["providerBookings"] });
    },
  });

  // SignalR Real-Time Listener
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}/hubs/booking`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveScheduledBookingRequest", () => {
      queryClient.invalidateQueries({ queryKey: ["providerScheduledRequests"] });
    });

    connection.on("BookingExpired", () => {
      queryClient.invalidateQueries({ queryKey: ["providerScheduledRequests"] });
      queryClient.invalidateQueries({ queryKey: ["providerBookings"] });
    });

    connection.start().catch((err) => {
      console.debug("SignalR connection error:", err);
    });

    return () => {
      connection.stop();
    };
  }, [queryClient]);

  const handleDeclineSubmit = () => {
    if (!declineItem) return;
    declineMutation.mutate({ id: declineItem.id, reason: declineReason.trim() || undefined });
  };

  const formatCountdown = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) {
      return { text: "Expired", isUrgent: true };
    }
    const totalMinutes = Math.floor(diff / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const isUrgent = hours < 2;
    const text = hours > 0 ? `Expires in ${hours}h ${mins}m` : `Expires in ${mins}m`;
    return { text, isUrgent };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <CalendarCheck className="h-8 w-8 text-primary" />
            Bookings & Inquiries
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review incoming scheduled customer inquiries and manage your confirmed appointments.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="requests" className="gap-2">
            <span>Inquiries / Requests</span>
            {requests.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px] rounded-full">
                {requests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="gap-2">
            <span>Confirmed Bookings</span>
            {confirmedBookings.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px] rounded-full">
                {confirmedBookings.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Requests / Inquiries Tab ─────────────────────────────────── */}
        <TabsContent value="requests" className="space-y-4">
          {loadingRequests ? (
            <div className="p-12 text-center text-muted-foreground">Loading inquiries...</div>
          ) : requestsError ? (
            <div className="p-6 border border-destructive/30 rounded-lg bg-destructive/10 text-destructive text-sm">
              Failed to load booking requests.
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border bg-card/40 rounded-lg animate-fade-up">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                <Inbox className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No Pending Inquiries</h3>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                When customers schedule appointments for your service listings, they will appear
                here for your review with a 24-hour expiration window.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {requests.map((booking) => {
                const countdown = formatCountdown(booking.expiresAt);
                return (
                  <Card
                    key={booking.id}
                    className="border-border hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div className="h-1.5 bg-primary w-full" />
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                            {booking.category ?? "Service Request"}
                          </span>
                          <h3 className="text-lg font-bold text-foreground">
                            {booking.customerName ?? "Customer"}
                          </h3>
                        </div>
                        {countdown && (
                          <Badge
                            variant={countdown.isUrgent ? "destructive" : "secondary"}
                            className="flex items-center gap-1 shrink-0 font-medium text-xs px-2.5 py-0.5"
                          >
                            <Clock className="h-3 w-3" />
                            {countdown.text}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {booking.scheduledAt
                              ? new Date(booking.scheduledAt).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "Pending scheduling"}
                          </span>
                        </div>
                        {booking.customerPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{booking.customerPhone}</span>
                          </div>
                        )}
                        {booking.serviceLocation && (
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{booking.serviceLocation}</span>
                          </div>
                        )}
                      </div>

                      {booking.notes && (
                        <div className="text-xs text-muted-foreground bg-accent/20 p-2.5 rounded border border-border/40">
                          <span className="font-semibold text-foreground">Customer Notes: </span>
                          {booking.notes}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="text-sm font-bold text-foreground">
                          {booking.price ? `LKR ${booking.price.toLocaleString()}` : "Price TBD"}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeclineItem(booking)}
                            disabled={declineMutation.isPending || confirmMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => confirmMutation.mutate(booking.id)}
                            disabled={declineMutation.isPending || confirmMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Confirmed Bookings Tab ───────────────────────────────────── */}
        <TabsContent value="confirmed" className="space-y-4">
          {loadingBookings ? (
            <div className="p-12 text-center text-muted-foreground">
              Loading confirmed bookings...
            </div>
          ) : bookingsError ? (
            <div className="p-6 border border-destructive/30 rounded-lg bg-destructive/10 text-destructive text-sm">
              Failed to load bookings.
            </div>
          ) : confirmedBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border bg-card/40 rounded-lg animate-fade-up">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                <CalendarCheck className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                No Confirmed Bookings
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Accepted appointments and ongoing jobs will show up here.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {confirmedBookings.map((b) => (
                <Card key={b.id} className="border-border hover:shadow-xs transition-shadow">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground">
                          {b.customerName ?? "Customer"}
                        </h4>
                        <BookingStatusBadge status={b.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {b.category && <span>Category: {b.category}</span>}
                        {b.scheduledAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(b.scheduledAt).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        )}
                        {b.serviceLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {b.serviceLocation}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col justify-between sm:justify-center items-end">
                      <div className="text-sm font-bold text-foreground">
                        {b.price ? `LKR ${b.price.toLocaleString()}` : "Price TBD"}
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {b.bookingType === "InstantMatch" ? "Instant Match" : "Scheduled"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Decline Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!declineItem} onOpenChange={(open) => !open && setDeclineItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Decline Booking Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this request from{" "}
              <span className="font-semibold text-foreground">{declineItem?.customerName}</span>?
              Declining will immediately release this time slot on your calendar and notify the
              customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label htmlFor="decline-reason" className="text-xs font-medium text-foreground">
              Decline Reason (Optional)
            </label>
            <Textarea
              id="decline-reason"
              placeholder="Provide a brief reason (e.g. Schedule conflict, out of service area)..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeclineItem(null)}
              disabled={declineMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineSubmit}
              disabled={declineMutation.isPending}
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
