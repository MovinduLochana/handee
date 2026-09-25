# 02: Schedule Collision & Availability Engine Hardening

**What to build:** An accurate, resilient scheduling engine that prevents double-booking across both fixed-duration service listings and variable-scope on-demand jobs, protects provider operating hours, and cleanly manages availability slot state transitions.

**Blocked by:** 01: Architecture Cleanup & Workflow Domain Enum Normalization

**Status:** ready-for-agent

- [ ] Schedule collision verification calculates end times dynamically for existing on-demand bookings using job request scope/duration rather than a static 60-minute default.
- [ ] Booking requests for providers with no configured availability slots are validated against standard operating hours rather than bypassing availability checks entirely.
- [ ] Slot reservation state updates are encapsulated in provider availability domain logic rather than direct external property mutations in `BookingService`.
- [ ] Booking creation across boundary conditions (exact start/end slot boundaries, adjacent non-overlapping bookings) functions correctly.
- [ ] Positive scheduling and collision rejection paths are verified with comprehensive unit and integration tests.
