# 04: Admin Dispute Adjudication Queue & Lifecycle

**What to build:** An administrative dispute handling mechanism where customers or providers can raise disputes on contested bookings, and administrators can review a sorted queue of unresolved disputes and adjudicate them with notes, auditable history, and real-time alerts sent to both parties.

**Blocked by:** 02: Customer Service Listing Booking Flow, 03: SignalR Real-Time Status & Dispatch Hub

**Status:** ready-for-agent

- [ ] Customers and providers can transition a non-terminal booking into `Disputed` status with a required dispute explanation.
- [ ] Administrators can retrieve a paginated queue of all currently disputed bookings sorted by oldest unresolved dispute first.
- [ ] Administrators can adjudicate a disputed booking to either `Completed` or `Cancelled` by providing decision notes.
- [ ] Adjudicating a dispute records an auditable log entry capturing the admin ID, prior status, target status, timestamp, and decision rationale.
- [ ] Dispute submission and adjudication trigger real-time SignalR notifications to the involved customer and provider.
- [ ] Unauthorized users cannot view the dispute queue or adjudicate disputes.
- [ ] Dispute status transitions and adjudication rules are verified by automated tests.
