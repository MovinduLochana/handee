# Specification: Booking Component and Workflow Hardening

**Triage Label**: `ready-for-agent`

## Problem Statement

Homeowners, service providers, and administrators interacting with Handee's booking and AI dispatch systems face inconsistencies, functional omissions, and latent scheduling vulnerabilities:
1. **Missing Live Alerts on Direct Bookings**: When a customer books a published service listing, providers receive no real-time push alert over SignalR, forcing them to manually refresh the screen or risk missing time-sensitive appointments.
2. **Silent Availability Bypasses & Collision Blindspots**: When a service provider has not configured explicit availability slot records, the booking engine bypasses provider schedule verification entirely. Furthermore, overlapping booking detection defaults on-demand job bookings to a rigid 60-minute duration, allowing customer appointments to collide with multi-hour active jobs.
3. **Architectural Route Ambiguity**: Legacy un-prefixed controller routes remain active alongside the standardized API prefixes, creating confusion for mobile and web clients regarding authoritative endpoints.
4. **Primitive Obsession & Database Coupling**: AI workflow entities rely on raw string columns with manual parsing switches and unmapped adapter properties in code, leaving domain entities brittle and bypassing Entity Framework's type-safe value converters.
5. **Redundant Endpoint Exposure**: Customers can book service listings through two disparate endpoints with duplicated error mapping logic across distinct controllers.

## Solution

Harden and complete the Booking Component and Workflow architecture:
1. Integrate real-time SignalR notifications into the direct booking workflow, immediately broadcasting dispatch alerts and status transitions to provider and customer channels.
2. Enforce rigorous schedule conflict detection that dynamically evaluates job duration across all booking types (listing and on-demand requests) and mandates clear availability validation rules.
3. Eliminate duplicate legacy route aliases, standardizing strictly on consistent API route prefixes.
4. Refactor AI workflow entities to use native enum domain properties backed by database string value conversions, eliminating primitive obsession and boilerplate parsers.
5. Consolidate direct booking into a single unified RESTful endpoint, removing redundant controller action forwarding and duplicate exception handling.
6. Encapsulate availability slot reservation within provider domain logic rather than external state mutation.

---

## User Stories

1. As a customer, I want to book an active service listing with an exact scheduled time and service notes, so that my maintenance appointment is recorded and confirmed.
2. As a customer, I want to receive an immediate rejection if I try to book a provider whose working window does not accommodate my selected time slot, so that I do not schedule impossible appointments.
3. As a customer, I want the system to reject my booking request if the provider is already committed to an overlapping multi-hour on-demand job, so that the provider arrives as promised.
4. As a customer, I want to receive live WebSocket push notifications the instant a provider confirms, begins, or completes my booking, so that I stay informed in real time without refreshing.
5. As a customer, I want all booking endpoints to use consistent, predictable API URL prefixes, so that mobile and web clients behave identically.
6. As a customer, I want an itemized invoice automatically generated with transparent platform fees upon booking a listing, so that billing is clear before work begins.
7. As a customer, I want clear and informative error messages when a listing is deactivated, unavailable, or conflicting, so that I can select an alternative time or provider.
8. As a service provider, I want to receive an immediate real-time push notification when a customer books one of my published listings, so that I can accept or prepare for the job without delay.
9. As a service provider, I want my scheduled availability slots to automatically mark as reserved upon booking confirmation, so that other customers cannot double-book that time.
10. As a service provider, I want my active on-demand jobs of any duration to block out my calendar accurately, so that customer listing bookings do not overlap with extensive repairs.
11. As a service provider, I want to view newly requested listing bookings in my incoming offers queue immediately after creation, so that my dispatch pipeline remains current.
12. As a platform administrator, I want AI agent workflow validation tiers and approval states to be represented by strictly typed domain enums, so that workflow filtering and automation rules avoid runtime string typos.
13. As a platform administrator, I want workflow approvals and automated dispatches to publish typed notifications across administrative monitoring screens, so that operator visibility is instantaneous.
14. As an API client developer, I want a single canonical endpoint for booking creation rather than competing paths across multiple controllers, so that integration is simple and maintainable.
15. As a database maintainer, I want domain enums serialized cleanly to readable strings in PostgreSQL without redundant unmapped bridge properties, so that the database schema is clean and normalized.

---

## Implementation Decisions

### 1. Real-Time SignalR Event Dispatch
- Wire real-time notification dispatch into booking creation and status lifecycle methods.
- When `CreateFromListingAsync` succeeds, publish `ReceiveNewJobDispatch` and `ReceiveBookingStatusUpdate` events to the provider's dedicated SignalR group (`Provider_{providerId}`) and customer group (`Customer_{customerId}`).
- Ensure real-time notifications execute after database transaction commit to guarantee clients only receive confirmed state updates.

### 2. Schedule Collision & Availability Detection Hardening
- Refactor booking overlap verification to calculate realistic end times for all active booking types:
  - For listing bookings: use the listing's explicit estimated duration (falling back to 1 hour if unspecified).
  - For on-demand job request bookings: dynamically evaluate the associated service category's default duration or job request metadata rather than an arbitrary 60-minute constant.
- For providers without explicit slot records: enforce a platform policy ensuring bookings fall within standard daytime operating windows (e.g. 08:00 to 18:00 provider local time) or mandate slot creation for published listings.
- Encapsulate availability slot state modification within a domain method on the provider availability repository or entity, replacing direct property manipulation in the booking service.

### 3. Route Normalization & Legacy Cleanup
- Remove legacy un-prefixed controller route attributes (`[Route("bookings")]` and `[Route("admin/agent-workflows")]`).
- Standardize all endpoints under unified `/api/...` prefixes.
- Consolidate customer listing booking into `POST /api/bookings`, removing the forwarding wrapper `POST /api/service-listings/{id}/book` from the listings controller to avoid divergent code and duplicate exception handling.

### 4. Domain Enum Conversion & Primitive Obsession Elimination
- In the workflow entity, replace string properties `ValidationTier` and `ApprovalStatus` with native enum properties `WorkflowValidationTier` and `WorkflowApprovalStatus`.
- Configure Entity Framework Core model builders using `HasConversion<string>()` with max length constraints so that PostgreSQL stores descriptive string values while domain and application layers remain completely type-safe.
- Remove `[NotMapped]` adapter properties, manual string switch parsers, and custom formatter methods.

---

## Testing Decisions

### What Makes a Good Test
- Tests must verify observable external HTTP behavior, state machine transitions, and database state invariants rather than internal implementation details.
- Avoid mocking Entity Framework `DbContext` directly; use in-memory database providers or SQLite test instances for transactional isolation.
- Test failure cases with boundary conditions: exact slot boundaries, multi-hour overlapping jobs, midnight UTC offset conversions, and inactive listing attempts.
- Real-time hub tests must assert that hub clients receive correct payloads with matching group addressing.

### Tested Modules
- **Booking Service & Availability Engine**: Positive booking creation, slot reservation, multi-hour collision detection with both listing and on-demand bookings, and timezone offset normalization.
- **SignalR Real-Time Broadcasting**: Mocked hub context assertions verifying provider and customer groups receive expected dispatch and status update payloads.
- **API Controllers**: HTTP status code assertions (201 Created, 400 Bad Request, 404 Not Found, 401 Unauthorized, 403 Forbidden) and route mapping verification.
- **Workflow Domain Enums**: Entity Framework persistence and retrieval round-trip tests asserting that enums correctly persist as readable strings in SQL and deserialize into domain enums.

### Prior Art
- `ListingBookingServiceTests` demonstrates in-memory database seeding, slot reservation assertions, and invoice verification.
- `BookingControllerListingTests` provides controller testing patterns using mocked service abstractions and claims principal contexts.
- `AgentWorkflowEnumsTests` validates enum conversion semantics.

---

## Out of Scope
- Implementing client-side WebSockets in Flutter or React (backend hub and event contracts only).
- Dynamic provider slot generation based on Google Calendar sync.
- Complex recurring availability rules (e.g. bi-weekly recurring patterns).
- Multi-currency conversion or external payment gateway certification.

---

## Further Notes
- This specification addresses all findings identified in the standards and specification code review of the booking component and workflow.
- All refactorings are non-breaking for existing business workflows and preserve complete backward compatibility for data stored in PostgreSQL.
