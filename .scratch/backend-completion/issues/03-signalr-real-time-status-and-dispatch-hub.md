# 03: SignalR Real-Time Status & Dispatch Hub

**What to build:** A persistent WebSocket channel that delivers instant status notifications to customers and providers whenever a booking lifecycle state changes or when an AI agent dispatches a job. Mobile and web clients connect using their authentication token and receive live events without polling.

**Blocked by:** 01: Architecture Normalization & Standards Prefactoring

**Status:** completed

- [x] Clients can authenticate and connect to `/hubs/booking` using their JWT bearer token via WebSocket query-string or header authorization.
- [x] Connected users are automatically mapped to their secure identifier-specific SignalR groups (`Customer_{id}`, `Provider_{id}`, and `Admin`).
- [x] Transitioning a booking status (e.g., Requested -> Accepted -> InProgress -> Completed) pushes a typed status update event to the associated customer and provider within milliseconds.
- [x] Successfully dispatching or approving an AI job match pushes a new job notification event directly to the targeted provider.
- [x] Disconnections and reconnections are handled gracefully without throwing unhandled server exceptions.
- [x] Hub connection authorization, group enrollment, and event dispatch are verified by automated tests.
