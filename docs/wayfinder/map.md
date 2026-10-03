# Wayfinder Map: Component 1 — Booking & Scheduling

## Destination

Full-stack completion of Component 1 (Booking & Scheduling): Audit, design, and close all gaps across ASP.NET Core backend API, React web portal, Flutter mobile app, and internal AI agent integration for both Instant Match and Service Listing booking paths.

## Notes

- **Domain**: Handee Marketplace — Component 1 (Booking & Scheduling)
- **Skills to consult**: `domain-modeling`, `codebase-design`, `diagnosing-bugs`, `modern-web-guidance`
- **Architectural Rules**:
  - Single public backend (`ASP.NET Core Web API`) talking to PostgreSQL.
  - Internal Python Agentic AI service (LangGraph) reached only via backend.
  - Mandatory cross-platform demo workflow (Flutter request -> API -> AI -> React Admin gate -> SignalR push to Flutter).
  - RBAC security on all endpoints (`Customer`, `Provider`, `Admin`).

---

## Tickets (Frontier)

- [x] [T1: Service Listing Direct Booking Flow](tickets/T1-service-listing-direct-booking-flow.md) `wayfinder:task` `closed`
- [x] [T2: Provider Availability Calendar & Time-Slot Management](tickets/T2-provider-availability-calendar-and-slots.md) `wayfinder:task` `closed`
- [ ] [T3: Booking Lifecycle Actions, Rescheduling & SignalR Status Push](tickets/T3-booking-lifecycle-reschedule-cancel-dispute.md) `wayfinder:task` `unblocked`
- [ ] [T4: Instant Match AI Domain Agent & Admin Approval Gate Integration](tickets/T4-instant-match-ai-domain-agent-integration.md) `wayfinder:research` `unblocked`
- [ ] [T5: React Web App Customer Bookings & Self-Service Portal](tickets/T5-customer-portal-bookings-management-screen.md) `wayfinder:task` `unblocked`
- [x] [T6: SE3090 Software Testing & Quality Evaluation Suite](tickets/T6-se3090-software-testing-and-quality-evaluation.md) `wayfinder:task` `closed`

---

## Decisions so far

- **T1 Direct Listing Booking Contract & UX**:
  - Direct fixed-price listing bookings map to `POST /bookings` (`CreateListingBookingDto`: `{ serviceListingId, scheduledAt, notes }`).
  - Booking status initial state is `Requested`, reserving matching `ProviderAvailabilitySlot`, generating atomic `Invoice` draft (`AutoApproved`), and emitting SignalR notifications.
  - Flutter app provides `_BookingFormSheet` date/time picker modal bottom-sheet with dynamic error display and SnackBar feedback.
  - React app provides `BookingModal` with `datetime-local` picker, optional notes, and error alert banners, tested against C# DTO contracts.

- **T2 Provider Availability Calendar & Time-Slot Management**:
  - Standardized all endpoints on `/api/provider-availability` with public read access (`[AllowAnonymous]`) filtering past slots, unbooked slots, and active booking collisions.
  - Added transactional batch and recurring schedule generation (`CreateBatchSlotsAsync`, `CreateRecurringSlotsAsync`) with overlap detection.
  - Built React Provider Portal calendar management (`/provider/availability`) with day-grouped view, single slot modal, recurring timetable generator modal, and slot deletion.
  - Added slot selection chips to React `BookingModal` and Flutter `_BookingFormSheet` via `ProviderAvailabilitySlotPicker` with flexible fallback.

---

## Not yet specified (Fog of war)

- **Live Provider GPS Tracking during InProgress state**: Real-time location stream mapping on Flutter during active booking execution.
- **Dispute Resolution & Payment Refund Handoff**: Automated trigger to adjust invoice or issue sandbox refund when Admin resolves a dispute.
- **Multi-slot Recurring Maintenance**: Scheduling multiple recurring dates for routine maintenance service listings.

---

## Out of scope

- **Real Money Payment Gateways**: Production Stripe/PayHere integration (all transactions use sandbox/test gateway).
- **Multi-country Localization**: Multi-currency and multi-language support outside Sri Lanka.
