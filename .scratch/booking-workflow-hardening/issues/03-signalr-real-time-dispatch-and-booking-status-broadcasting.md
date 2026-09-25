# 03: SignalR Real-Time Dispatch & Booking Status Broadcasting

**What to build:** Immediate real-time WebSocket communication for booking creation and status lifecycle events, notifying providers and customers instantaneously over SignalR without client-side polling.

**Blocked by:** 02: Schedule Collision & Availability Engine Hardening

**Status:** ready-for-agent

- [ ] Successful listing booking creation triggers typed real-time notifications to the provider's SignalR channel (`ReceiveNewJobDispatch` and `ReceiveBookingStatusUpdate`).
- [ ] Booking status lifecycle transitions (e.g. Accepted, InProgress, Completed, Cancelled) broadcast updates to customer and provider groups.
- [ ] Real-time event dispatches execute only after the database transaction has committed successfully.
- [ ] Unit and service integration tests verify that hub messages are emitted with the expected payloads and targeted recipient groups.
