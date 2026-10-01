# Specification: Streamlined Service-Listing Booking & Simplified 1-Hour Slot Engine

**Triage Label**: `ready-for-agent`

## Problem Statement

Homeowners, service providers, and operations teams on Handee experience significant friction, scheduling unpredictability, and confusion due to disjointed booking workflows and an over-engineered slot management system:

1. **Inconsistent and Misleading Booking Pathways**: When customers browse a service provider's profile, they are confronted with conflicting options. Alongside standardized service offerings, there are generic "Request Service" or "Book this Pro" buttons that either trigger unimplemented alert dialogs or redirect the user into generic AI job requests. Customers expect a predictable booking experience where every appointment is grounded in a concrete, well-defined service listing with explicit scope and pricing.
2. **Disconnected AI Instant Match**: When customers use the Instant Match workflow, the AI system matches the request to a provider's top-level identity rather than a published service listing. Bookings generated through automated dispatch leave the service listing identifier empty, guess a pricing amount, and assign arbitrary appointment timestamps without checking whether the provider is operating or available.
3. **High Operational Burden in Provider Scheduling**: Service providers are currently required to manually generate and maintain recurring batches of physical time slot records over finite calendar horizons. If a provider fails to run this schedule generator, their profile appears completely unavailable to customers.
4. **Duration Mismatches & Slot Boundary Violations**: Service listings currently permit arbitrary durations (such as 45 minutes or 90 minutes). Because bookable calendar intervals are hourly, non-integer durations create partial slot overlaps, leave orphaned fragments of time, and create collision vulnerabilities when booking multi-hour appointments.

---

## Solution

Streamline Handee's booking and scheduling architecture by establishing the **Service Listing** as the sole entry point for bookings, simplifying provider working hours, and enforcing clean 1-hour slot consumption:

1. **Sole Entry Point via Service Listings**:
   - Eliminate direct provider booking without a listing. Every booking in the marketplace must reference a valid, active `ServiceListing`.
   - On provider profile screens across web and mobile, guide customers directly to browse and book the provider's published fixed-price service listings.
2. **Service-Listing-Centric Instant Match**:
   - Upgrade the AI matching pipeline to identify the customer's required service category and select a specific active `ServiceListing` from a verified provider in the customer's area.
   - Ground Instant Match bookings and initial invoice drafts in the matched listing's fixed price, duration, and title.
3. **Declarative Weekly Operating Schedules**:
   - Replace manual recurring slot batch generation with a declarative operating schedule (specifying active working days and daily start/end hours, defaulting to standard business hours).
   - Dynamically compute available 1-hour slots on query by subtracting existing confirmed appointments from the provider's operating hours, eliminating the need to persist thousands of empty slot records.
4. **Integer-Hour Duration & Consecutive Multi-Slot Validation**:
   - Constrain service listing durations to whole integers ($N \in \{1, 2, \dots, 8\}$ hours).
   - Define slot consumption such that an $N$-hour service consumes $N$ consecutive 1-hour time slots.
   - Enforce that multi-hour appointments fit entirely within operating hours before closing time and do not collide with active bookings at any point during their duration.

---

## User Stories

### Customer Booking Experience
1. As a customer browsing a provider's public profile, I want to see their published fixed-price service listings clearly presented, so that I know exactly what services they offer and at what price.
2. As a customer viewing a provider profile, I want all booking actions to direct me to a specific service listing, so that I am never confused by non-functional or ambiguous direct-hire buttons.
3. As a customer selecting a service listing, I want to view the provider's open 1-hour time slots on an interactive calendar for my chosen date, so that I can easily find a time that works for me.
4. As a customer booking a multi-hour service (e.g. 2 hours), I want available start times to only include hours where the provider has enough consecutive open hours to complete the job, so that my appointment is not cut short.
5. As a customer booking an afternoon service, I want start times that would exceed the provider's daily closing time to be hidden or disabled, so that I do not schedule work after operating hours.
6. As a customer booking a listing, I want my appointment to begin precisely on the hour (e.g. 10:00 AM, 11:00 AM), so that scheduling remains simple and aligned with standard time slots.
7. As a customer confirming a booking, I want an itemized invoice draft generated immediately matching the service listing's fixed price, so that there are no surprise fees or pricing disputes.
8. As a customer, I want to receive immediate feedback if a time slot I just selected was booked by someone else milliseconds earlier, so that I can pick the next best available hour.

### AI Instant Match Workflow
9. As a customer requesting emergency or on-demand service via Instant Match, I want the AI to match me with a provider's specific service listing, so that the scope of work and price are transparent.
10. As a customer using Instant Match, I want my dispatched booking to include an assigned appointment slot within the provider's actual working hours, so that I know when the provider will arrive.
11. As a platform administrator reviewing Instant Match dispatches, I want to see the specific service listing chosen by the AI, so that I can verify that the recommended service matches the customer's request.
12. As a platform administrator approving an AI dispatch, I want the approved booking to reserve the provider's corresponding hourly slots atomically, so that the provider is not double-booked.

### Provider Operating Hours & Availability Management
13. As a service provider, I want to configure my standard weekly working hours (e.g. Monday to Friday, 09:00 to 17:00) with a single settings screen, so that I do not have to manually generate calendar schedules every week.
14. As a service provider, I want standard business hours applied by default when I register, so that customers can immediately book my services without me having to configure complex timetables first.
15. As a service provider, I want to toggle individual days on or off and adjust my start and end times, so that my calendar accurately reflects my working schedule.
16. As a service provider, I want my bookable slots to automatically project into the future based on my working hours, so that my availability is always up to date.
17. As a service provider, I want accepted and in-progress customer bookings to automatically block out the corresponding hours on my schedule, so that customers cannot double-book my time.

### Provider Service Listing Management
18. As a service provider creating a service listing, I want to select the required duration in whole hours (1 hour, 2 hours, 3 hours, etc.), so that my service cleanly consumes the appropriate number of appointment slots.
19. As a service provider editing an existing service listing, I want to update its duration in whole hours, so that the scheduling engine reserves the correct window for future bookings.
20. As a service provider onboarding to the platform, I want to be prompted to publish at least one service listing, so that my profile is immediately discoverable and bookable in the marketplace.

### Platform Administration & System Integrity
21. As a platform administrator, I want every booking record in the database to be linked to a valid service listing, so that marketplace reporting, analytics, and invoicing remain consistent.
22. As a platform administrator, I want the system to reject any booking request that attempts to bypass service listings, so that rogue bookings cannot enter the platform.
23. As an API client developer, I want provider availability queries to accept the service duration and return pre-validated start times, so that the frontend does not have to reimplement multi-slot collision math.

---

## Implementation Decisions

### 1. Unified Service-Listing Booking Invariant
- **Single Canonical Entry Point**: All booking creation operations must require a valid `ServiceListingId`. Direct booking of a provider account without an associated service listing is eliminated.
- **Frontend Action Alignment**:
  - Remove all generic direct-booking actions on provider profile views across web and mobile.
  - Profile headers and sidebars will feature a primary action directing users to the provider's active service catalog (e.g., smooth-scrolling to the listing grid).
  - Each individual service listing card remains the authoritative trigger for opening the booking interface.
- **Listing Mandate for Providers**: Providers without at least one active, published service listing are ineligible for customer marketplace booking and are excluded from Instant Match candidate pools.

### 2. Declarative Operating Hours & Dynamic Slot Projection
- **Declarative Operating Schedule Contract**:
  - Instead of generating and storing individual slot rows in a database table, providers maintain a weekly operating schedule rule.
  - A provider's weekly schedule defines for each active day of the week:
    - Active status (`bool`)
    - Daily start working time (time of day, e.g. `09:00:00`)
    - Daily end working time (time of day, e.g. `17:00:00`)
  - A fallback policy automatically applies standard default working hours (Monday through Friday, 09:00 to 17:00) when a provider has not explicitly configured custom hours.
- **Dynamic On-Demand Slot Engine**:
  - The public availability endpoint calculates available slots on the fly for requested date ranges by:
    1. Looking up the provider's operating hours for each calendar day in the range.
    2. Generating 1-hour time blocks starting on the hour from the daily start time up to the daily end time.
    3. Querying confirmed active bookings (`Requested`, `Accepted`, `InProgress`) falling within the window.
    4. Subtracting booked hours from available hours.
  - Eliminates batch generation jobs, expiration cleanup routines, and database bloat from storing empty slot records.

### 3. Whole-Hour Service Durations & Multi-Slot Collision Mathematics
- **Integer Duration Requirement**:
  - Service listing definitions store `DurationHours` as a positive integer ($1 \le N \le 8$).
  - Forms for creating or editing service listings replace free-form time inputs (`HH:MM:SS`) with integer hour selectors.
- **Boundary & Consecutive Slot Validation**:
  - For a service with duration $N$ hours and a requested start time $T$:
    1. **Hour Alignment**: $T$ must be on the top of the hour (`T.Minute == 0` and `T.Second == 0`).
    2. **Operating Window Fit**: $T.\text{TimeOfDay} + N \text{ hours} \le \text{DailyEndTime}$.
    3. **Contiguous Availability**: For every hour offset $i \in \{0, 1, \dots, N-1\}$, the interval $[T + i, T + i + 1]$ must be completely free of conflicting active bookings.
- **Availability Query Parameter**:
  - The slot query API accepts an optional `durationHours` parameter. When supplied, it only returns start times that satisfy both operating window fit and contiguous availability for all $N$ hours.

### 4. Instant Match Service Listing Selection
- **AI Agent Tooling**:
  - The action agent tool for candidate discovery searches published, active service listings matching the customer's classified category and geographic area.
  - The agent evaluates candidate listings based on provider verification, customer ratings, and scope relevance.
- **Workflow State & Dispatch Contract**:
  - The AI workflow state and dispatch output contract include the matched `ServiceListingId`, `ListingTitle`, `FixedPrice`, and `DurationHours`.
  - When the workflow auto-dispatches or receives administrative approval, the booking is created referencing the matched `ServiceListingId`.
  - The booking's initial invoice draft is locked to the listing's fixed price, eliminating arbitrary price guesswork.

### 5. Concurrency & Race Condition Protection
- Booking creation executes inside an isolated database transaction with conflict detection.
- Before committing a new booking, the booking service validates that no overlapping booking exists for that provider during the full $[T, T + N)$ window.
- In relational database environments, collision checks utilize serializable isolation or advisory locking on `(ProviderId, Date)` to guarantee zero double-booking races.

---

## Testing Decisions

### What Makes a Good Test
- **External Behavior Verification**: Tests must verify observable system behavior across external seams (HTTP response status codes, payload contracts, persisted database states, and rendered UI states) without asserting internal private helper methods.
- **Boundary & Collision Verification**: Tests must comprehensively exercise boundary conditions, including appointment requests starting at the final possible hour, requests that exceed daily closing by one minute, non-integer minute inputs, and overlapping multi-hour windows.
- **Concurrency Verification**: Tests must verify that two concurrent requests for the same time window result in exactly one successful booking and one clear validation failure.

### Tested Modules & Seams

1. **Backend Booking API & Service Layer (Highest Backend Seam)**:
   - Verify `POST /api/bookings` succeeds with 201 Created and persists a valid booking when selecting an available contiguous multi-hour slot.
   - Verify rejection with 400 Bad Request when booking start time has non-zero minutes.
   - Verify rejection with 400 Bad Request when requested duration overruns the provider's daily operating closing time.
   - Verify rejection with 400 Bad Request when any hour within a multi-hour window collides with an existing active booking.
   - Verify that bookings created via Instant Match auto-dispatch persist a non-null `ServiceListingId` and lock invoice amounts to the listing fixed price.
2. **Backend Availability API Layer**:
   - Verify `GET /api/provider-availability/{providerId}` returns dynamically projected 1-hour slots based on operating hours without reading legacy static slot records.
   - Verify that passing `durationHours=2` omits the last hour of the day and any slot immediately preceding an existing 1-hour booking.
   - Verify updating operating hours via `PUT /api/provider-availability/schedule` immediately alters dynamically returned slots.
3. **Web & Mobile Booking Interfaces (Highest Client Seam)**:
   - Component test for `BookingModal`: Selecting a date fetches available slots with the listing's duration, renders valid start hour chips, and submits the chosen timestamp.
   - Component test for `ProviderAvailability`: Renders weekly day toggles and time inputs, and saves schedule changes without batch generation modals.
   - Integration test verifying that provider public profile screens only permit booking via active service listing cards.
4. **AI Agent Dispatch Workflow Seam**:
   - Workflow test for `dispatch_workflow`: Verify that given a categorized job request, the action tool selects a concrete `ServiceListingId` from candidate listings and outputs it in the dispatch payload.

### Prior Art in Codebase
- [`ListingBookingServiceTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Bookings/ListingBookingServiceTests.cs) for in-memory booking creation, conflict assertions, and transaction rollbacks.
- [`ProviderAvailabilityServiceTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Providers/ProviderAvailabilityServiceTests.cs) for provider schedule validation.
- [`BookingModal.test.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/tests/components/public/BookingModal.test.tsx) for web modal slot picking and form submission.
- [`booking_flow_test.dart`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/app/test/booking_flow_test.dart) for mobile sheet interaction.
- [`test_workflow.py`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/agents/tests/test_workflow.py) for agent dispatch evaluation.

---

## Out of Scope

- Splitting a single service appointment across multiple non-consecutive days (e.g. multi-day renovations; these remain managed via custom milestones).
- Provider calendar integration with third-party external providers (Google Calendar, Microsoft Outlook, Apple iCal sync).
- Variable surge pricing or dynamic hourly rates based on time of day or weekend peak hours.
- Fractional-hour time slots (such as 15-minute or 30-minute appointments); all platform slots are standardized to 60-minute blocks.

---

## Further Notes

- **Backward Compatibility**: To preserve existing testing records and past completed bookings, the database column `Booking.ServiceListingId` can remain structurally nullable in PostgreSQL while business logic in the booking service strictly enforces non-null values for all new appointments.
- **Default Working Hours**: For providers who have never explicitly configured custom hours, the dynamic slot engine defaults to Monday through Friday from 09:00 to 17:00, ensuring immediate marketplace readiness.
- Resolves the foundational scheduling and listing alignment requirements documented in [`docs/specs/streamlined-service-listing-booking-research.md`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/docs/specs/streamlined-service-listing-booking-research.md).
