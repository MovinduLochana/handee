# Ticket T3: Booking Lifecycle Actions, Rescheduling & SignalR Status Push

**Labels**: `wayfinder:task`, `unblocked`

## Question

How do we harden the complete Booking Lifecycle (`Requested` -> `Accepted` -> `InProgress` -> `Completed` / `Cancelled` / `Disputed`) with backend validation, SignalR real-time push, and UI action triggers?

## Context & Key Artifacts

- **Backend Controller**: [`BookingController.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/Controllers/BookingController.cs) (`PUT /api/bookings/{id}/status`, `PUT /api/bookings/{id}/schedule`)
- **SignalR Hub**: [`BookingHub.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/Hubs/BookingHub.cs)
- **Flutter Screen**: [`booking_detail_screen.dart`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/app/lib/screens/shared/booking_detail_screen.dart)
- **React Screen**: [`BookingDetail.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/pages/admin/BookingDetail.tsx)

## Gaps to Resolve

1. **Rescheduling Rules**: Enforce backend policy for `PUT /bookings/{id}/schedule` (only `Requested` or `Accepted` bookings can be rescheduled; notify counterparty).
2. **Cancellation Rules & Penalties**: Define cancellation window and status update flow.
3. **Dispute Creation & Admin Escalation**: Ensure customer/provider can flag `Disputed` status with a reason, opening an entry in Admin review queue.
4. **SignalR Event Broadcasting**: Ensure `BookingStatusUpdated` and `BookingRescheduled` events broadcast to both Flutter and React Web clients instantly.
