# Specification: Provider Availability Calendar & Time-Slot Management

**Triage Label**: `ready-for-agent`

## Problem Statement

Service providers and customers on the Handee marketplace encounter friction, scheduling ambiguities, and lack of visual tooling around appointment timing:

1. **Provider Inability to Manage Working Hours Visually**: Service providers on the React web portal have no visual calendar or timetable interface to define, view, or remove their operating availability slots. They cannot easily configure recurring schedules (such as standard weekday hours) or block out specific dates, leaving them either unrepresented in availability searches or forced to rely on manual, single-slot API operations.
2. **Opaque and Inflexible Slot Fetching for Customers**: The public availability endpoint requires authentication even when browsing public profiles, returns raw unorganized slot listings that include past/expired dates, and does not support filtering by target date ranges. Customers browsing provider profiles cannot easily determine when a provider is free to work.
3. **Disconnected Customer Booking Experience in Mobile & Web**: When booking a service listing on the Flutter mobile app or React web modal, customers are confronted with generic date/time pickers that allow any arbitrary minute to be selected without visibility into provider availability. This leads to frustrating server-side collision errors or accidental bookings during off-hours.
4. **Collision & Deletion Race Conditions**: Providers who need to adjust their schedules risk breaking active appointments if the deletion logic does not clearly distinguish between unbooked slots and slots reserved by confirmed or in-progress bookings.

## Solution

Establish an end-to-end Provider Availability Calendar and Slot Management system across the backend API, the React Provider Portal, and client booking interfaces:

1. **Backend Availability & Schedule Engine**:
   - Standardize all endpoints under `/api/provider-availability`.
   - Permit unauthenticated and customer-authenticated queries against public provider availability, filtering out expired slots and supporting date range queries.
   - Provide batch and recurring availability creation capabilities so providers can generate weekly recurring hours (e.g., Monday through Friday, 09:00 to 17:00 in 1-hour or 2-hour increments) in a single transactional request.
   - Prevent deletion of slots that are reserved by active bookings and prevent creation of overlapping slots.
2. **React Provider Availability Management Portal**:
   - Introduce an interactive Provider Availability Calendar and Slot Manager screen with weekly and monthly views.
   - Enable providers to toggle active work days, add single or bulk time slots, remove unbooked slots, and visually view which slots are reserved for upcoming customer jobs.
   - Provide toast alerts and validation feedback for overlapping slots and successful schedule generation.
3. **Client Time-Slot Selector in Flutter & React Booking Flows**:
   - Provide a reusable `ProviderAvailabilitySlotPicker` widget in the Flutter mobile app that queries the provider's active upcoming slots for any selected date and presents available windows as clean, selectable chips.
   - Upgrade the React `BookingModal` to dynamically fetch provider availability slots for selected days, highlighting available slots and disabling booked or unavailable times.
   - Gracefully fallback to standard working window guidelines when a provider has not explicitly defined slot records, informing the customer accordingly.

---

## User Stories

1. As a service provider, I want to view my availability schedule in an interactive weekly calendar on the web portal, so that I can easily see my free and booked slots at a glance.
2. As a service provider, I want to define a recurring weekly schedule (e.g., Monday through Friday, 09:00 to 17:00), so that I do not have to manually configure each individual day.
3. As a service provider, I want to add custom, one-off availability slots for specific dates and times, so that I can offer weekend or evening shifts when I have extra time.
4. As a service provider, I want to delete unbooked availability slots with a single click, so that I can close off time when personal commitments arise.
5. As a service provider, I want the system to prevent me from accidentally deleting slots that are already booked by a customer, so that confirmed appointments are not disrupted.
6. As a service provider, I want the system to reject any newly created slot that overlaps with an existing slot in my schedule, so that I maintain an organized timetable without conflicts.
7. As a service provider, I want to see which customer bookings correspond to my booked slots on my calendar, so that I can prepare for upcoming service calls.
8. As a service provider, I want to configure custom slot durations (e.g., 60 minutes, 120 minutes) when generating recurring slots, so that appointments match the typical length of my services.
9. As a customer browsing provider profiles on the web, I want to view the provider's upcoming available days and hours, so that I know whether they can accommodate my schedule before initiating a booking.
10. As a customer booking a service listing on the Flutter mobile app, I want to select a date and see the provider's available time slots displayed as interactive chips, so that I can book an open slot with minimal effort.
11. As a customer booking a service listing on the mobile app, I want slots that are already booked or in the past to be hidden or disabled, so that I never attempt to schedule an impossible appointment.
12. As a customer booking a service listing through the web modal, I want available time slots to load automatically upon choosing a date, so that I avoid typing manual timestamps.
13. As a customer, I want clear feedback when a provider has no available slots on my chosen date, with suggestions to check another day, so that I can quickly adapt my schedule.
14. As a customer, I want to book appointments even if a provider has not configured explicit discrete slots (falling back to standard platform daytime operating hours), so that booking is not completely blocked for new providers.
15. As a platform administrator, I want availability slot definitions to adhere to strict validation rules (start time preceding end time, minimum slot duration, future-only scheduling), so that scheduling data integrity is preserved across the marketplace.
16. As a frontend developer, I want a strongly typed API client for provider availability endpoints with clear error response contracts, so that both React and Flutter applications handle network and validation failures predictably.

---

## Implementation Decisions

### 1. Unified Route Standardization & Public Access Policy
- Consolidate all provider availability endpoints under `/api/provider-availability`.
- Relax authorization on `GET /api/provider-availability/{providerId}` to permit public (anonymous and authenticated) access, allowing customers browsing marketplace listings or profiles to fetch available slots without requiring provider privileges.
- Retain strict `[Authorize(Roles = "Provider")]` access on slot mutation endpoints:
  - `POST /api/provider-availability`: Create a single discrete availability slot.
  - `POST /api/provider-availability/batch`: Create multiple availability slots or apply recurring schedule rules transactionally.
  - `GET /api/provider-availability/mine`: Retrieve all slots (both booked and unbooked) for the authenticated provider.
  - `DELETE /api/provider-availability/{id}`: Delete an unbooked availability slot owned by the authenticated provider.

### 2. Query Filtering & Expired Slot Protection
- Enhance the slot retrieval service to accept optional date filtering parameters (`startDate` and `endDate`).
- For public/customer queries, enforce that only slots with `StartTime >= DateTimeOffset.UtcNow` and `!IsBooked` are returned.
- Filter out slots that overlap with confirmed active bookings, ensuring customers are never offered times where a provider is already committed to an on-demand job.

### 3. Batch and Recurring Slot Generation Contract
- Add a batch slot creation DTO allowing providers to submit either:
  - A list of explicit time intervals.
  - A weekly recurring rule specifying active days of the week, daily start and end working hours, slot duration, and date range horizon (e.g., next 2 to 4 weeks).
- Execute batch creation inside a database transaction, verifying collision invariants against all existing provider slots before committing.

### 4. React Provider Availability Management UI
- Create a dedicated Provider Availability page at `/provider/availability` accessible via the provider navigation in `AppShell`.
- Build a responsive timetable/calendar view with:
  - Weekly and daily view switches.
  - Color-coded slot cards (Green: Available/Unbooked; Blue: Booked/Reserved; Gray: Past).
  - Quick action to open a "Generate Weekly Schedule" modal for setting recurring hours.
  - Individual slot deletion with confirmation modal for unbooked slots.
- Integrate with React Query for optimistic cache invalidation upon slot creation or deletion.

### 5. Flutter & Web Slot Picker Integration
- **Flutter Widget**: Build a reusable `ProviderAvailabilitySlotPicker` supporting horizontal date scrolling and a grid of time chips corresponding to available backend slots.
- Wire the slot picker into `_BookingFormSheet` within `service_listing_details_screen.dart`, replacing manual time input with slot selection.
- **React Web Modal**: Update `BookingModal.tsx` to query `providerAvailabilityApi` for the provider associated with the listing. When a date is chosen, render available slots as clickable badges and pre-populate the submission payload with the chosen slot start time.

---

## Testing Decisions

### What Makes a Good Test
- Tests must verify observable system behavior across external boundaries (HTTP status codes, serialized JSON slot structures, database state transitions, and component rendered states) without coupling to internal private methods.
- Service and controller tests must assert proper handling of boundary conditions: slots crossing midnight UTC, adjacent non-overlapping slots, partial overlaps, and attempted deletion of booked slots.
- Component and widget tests must verify user interactions: clicking date selectors fetches corresponding slots, selecting a slot highlights it and enables the submission button, and empty slot responses display user-friendly fallback messaging.

### Tested Modules & Seams
1. **Backend Service & Controller Layer (Highest Backend Seam)**:
   - `ProviderAvailabilityServiceTests`: Unit and integration tests using in-memory database covering:
     - Rejection of end time before start time.
     - Collision detection on exact, partial, and engulfing slot overlaps.
     - Batch creation of non-overlapping slots.
     - Safe deletion of unbooked slots and 400 Bad Request rejection when deleting booked slots.
     - Expired slot filtering and date range filtering for public queries.
   - `ProviderAvailabilityControllerTests`: Verification of HTTP routing, role authorization, 201 Created responses, 401 Unauthorized for anonymous mutations, and 403 Forbidden for cross-provider modifications.
2. **React Web API & Components Layer (Highest Web Seam)**:
   - Vitest component tests for `ProviderAvailabilityCalendar`: Rendering slots, triggering slot creation dialog, and calling delete APIs.
   - Vitest component tests for `BookingModal`: Asserting that slots are fetched upon date selection and selected slot times are passed into booking submission.
3. **Flutter Widget & Repository Layer (Highest Mobile Seam)**:
   - Widget tests for `ProviderAvailabilitySlotPicker`: Simulating API response with multiple slots, rendering slot chips, tapping a chip, and verifying callback invocation.
   - Booking flow integration test verifying that selecting an available slot populates the booking request payload.

### Prior Art
- `ProviderAvailabilityServiceTests.cs` for backend slot validation and EF in-memory testing.
- `ListingBookingServiceTests.cs` for slot reservation and collision assertion patterns.
- `web/src/tests/components/public/BookingModal.test.tsx` for modal UI interaction and submission assertions.
- `app/test/booking_flow_test.dart` for Flutter bottom-sheet interaction and widget testing.

---

## Out of Scope

- External calendar synchronizations (Google Calendar, Outlook, Apple iCal API synchronization).
- Provider holiday / vacation blackouts with multi-timezone conversion outside Sri Lanka.
- Dynamic slot pricing based on peak hours or weekends.
- Automated SMS alerts to providers when availability slots are published.

---

## Further Notes

- Resolves Ticket T2 (`docs/wayfinder/tickets/T2-provider-availability-calendar-and-slots.md`) on the Wayfinder Component 1 roadmap.
- Backward-compatible with existing `ProviderAvailabilitySlot` database schema; requires no destructive schema migrations.
