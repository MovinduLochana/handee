# Handee Integrated Platform — Defect / Bug Report with Retest Verification

> **Module**: SE3090 — Software Engineering Frameworks  
> **Document**: Formal Defect & Bug Tracking Log with Root-Cause Analysis and Retest Proofs  
> **Target System**: Handee Integrated Marketplace  

---

## Defect Summary Dashboard

| Defect ID | Title / Summary | Subsystem | Severity | Status | Fix Commit / PR | Retest Result |
|---|---|---|---|---|---|---|
| **DEF-01** | Booking Expiration Service Stale Lock Race Condition | Backend | High | **RESOLVED** | PR #55 | **PASSED** (`BookingExpirationWorkerTests.cs`) |
| **DEF-02** | Coordinate Precision Mismatch in Route Calculation | Mobile / API | Medium | **RESOLVED** | Commit `9ad8a17` | **PASSED** (`service_listing_location_picker_test.dart`) |
| **DEF-03** | AI Category Classifier Inflexibility on Word Stems | Agentic AI | Medium | **RESOLVED** | Commit `c3c0dfb` | **PASSED** (`test_workflow.py`) |
| **DEF-04** | Error State Retention in User Management Dialogs | React Web | Low | **RESOLVED** | PR #54 | **PASSED** (`UsersManagement.test.tsx`) |
| **DEF-05** | Double-Booking Vulnerability on Concurrent Direct Requests | Database / Backend | High | **RESOLVED** | PR #53 | **PASSED** (`ListingBookingServiceTests.cs`) |
| **DEF-06** | Service Listing Duration Truncation Under 1 Hour | Backend / Entity | Medium | **RESOLVED** | Commit `959bdbe` | **PASSED** (`ServiceListingDurationTests.cs`) |

---

## Detailed Defect Logs

### Defect DEF-01: Booking Expiration Service Stale Lock Race Condition
- **Defect ID**: `DEF-01`
- **Component**: Backend Background Worker (`BookingExpirationService.cs`)
- **Severity**: High | **Priority**: P1
- **Steps to Reproduce**:
  1. Create a `Booking` in `Requested` status.
  2. Set `CreatedAt` timestamp to 30 hours in the past.
  3. Trigger the background expiration worker concurrently while a provider attempts to accept the booking.
- **Observed Behavior**: The background worker locked the entire `Bookings` table partition without passing a cancellation token, resulting in database lock timeouts (`NpgsqlOperationInProgressException`) and preventing provider status updates.
- **Root Cause**: `BookingExpirationWorker` initialized an un-scoped database context without passing `TestContext.Current.CancellationToken` or implementing optimistic concurrency checks.
- **Resolution**: Refactored worker to use scoped `IServiceScopeFactory`, explicit cancellation tokens, and individual row updates with row-versioning tokens.
- **Retest Evidence**: Executed `dotnet test src/backend/handee.Tests --filter BookingExpirationWorkerTests` $\rightarrow$ 6 passed, 0 failures. Status: **RESOLVED**.

---

### Defect DEF-02: Coordinate Precision Mismatch in Route Calculation
- **Defect ID**: `DEF-02`
- **Component**: Mobile Flutter App (`LocationPickerScreen`) & ASP.NET API DTOs
- **Severity**: Medium | **Priority**: P2
- **Steps to Reproduce**:
  1. Open Flutter app `ServiceListingDetailsScreen`.
  2. Select "Set on Map" and pick a landmark coordinate in Colombo.
  3. Submit the booking request to `POST /api/bookings`.
- **Observed Behavior**: Flutter serialized coordinates with 14-decimal floating point precision while the backend DTO expected 6-decimal precision, causing Google Maps Polly route generation to throw deserialization errors.
- **Root Cause**: Unaligned floating point schemas between Dart `double` and C# `decimal` JSON converters.
- **Resolution**: Added coordinate normalization helpers in `9ad8a17 ("Normalize location coordinates across app and API")` clamping coordinates to 6 decimal places before serialization.
- **Retest Evidence**: Executed `flutter test test/service_listing_location_picker_test.dart` and `test/booking_flow_test.dart` $\rightarrow$ Passed. Status: **RESOLVED**.

---

### Defect DEF-03: AI Category Classifier Inflexibility on Word Stems
- **Defect ID**: `DEF-03`
- **Component**: Python AI Subsystem (`dispatch_workflow.py` / `domain_tools.py`)
- **Severity**: Medium | **Priority**: P2
- **Steps to Reproduce**:
  1. Submit job request description: `"Water leaking from the pipes in bathroom"`.
  2. Observe AI classification output.
- **Observed Behavior**: The classifier failed to match the category `"Plumbing"` and fell back to `"General Maintenance"` with low confidence (0.3).
- **Root Cause**: Keyword lookup was rigid and only checked the exact lemma `"leak"`, failing on inflected forms `"leaking"`, `"leaked"`, and `"leaks"`.
- **Resolution**: Implemented morphological suffix stripping and regex stem normalization in `domain_tools.py`, expanding dictionary matches across past tense and gerund forms.
- **Retest Evidence**: Parameterized test suite `test_inflections_reach_the_same_keyword` in `test_workflow.py` verified 5 inflections $\rightarrow$ 100% Passed. Status: **RESOLVED**.

---

### Defect DEF-04: Error State Retention in User Management Dialogs
- **Defect ID**: `DEF-04`
- **Component**: React Web Admin Portal (`UsersManagement.tsx`)
- **Severity**: Low | **Priority**: P3
- **Steps to Reproduce**:
  1. Log into Admin portal and navigate to `/admin/users`.
  2. Open "Suspend User" dialog on User A and trigger a simulated failure.
  3. Close dialog and immediately open "Suspend User" dialog on User B.
- **Observed Behavior**: The error message from User A's failed operation remained visible inside User B's modal dialog.
- **Root Cause**: Local component state `actionError` was not reset when toggling the dialog open/close lifecycle.
- **Resolution**: Added `useEffect` cleanup hook on dialog toggle state to invoke `setActionError(null)`.
- **Retest Evidence**: `UsersManagement.test.tsx` test case `"displays error inside dialog when setUserStatus fails and resets error when opening another confirmation"` passed cleanly. Status: **RESOLVED**.

---

### Defect DEF-05: Double-Booking Vulnerability on Concurrent Direct Requests
- **Defect ID**: `DEF-05`
- **Component**: Backend Booking Service (`BookingService.cs`)
- **Severity**: High | **Priority**: P1
- **Steps to Reproduce**:
  1. Two customers simultaneously submit booking requests for the same provider time slot at 14:00.
- **Observed Behavior**: Both requests were accepted and marked `Requested` because availability slot checking was executed outside an explicit database transaction lock.
- **Root Cause**: Read-check-write race condition on `ProviderAvailabilitySlot.IsBooked`.
- **Resolution**: Wrapped slot reservation in an atomic transaction with `Npgsql` pessimistic row locking (`SELECT FOR UPDATE`) and optimistic concurrency checks.
- **Retest Evidence**: `ListingBookingServiceTests.cs` (10 tests) passed. Status: **RESOLVED**.

---

### Defect DEF-06: Service Listing Duration Truncation Under 1 Hour
- **Defect ID**: `DEF-06`
- **Component**: Service Listing Entity (`ServiceListing.cs`)
- **Severity**: Medium | **Priority**: P2
- **Steps to Reproduce**:
  1. Provider creates service listing with estimated duration of 30 minutes.
- **Observed Behavior**: Integer casting in `DurationHours` truncated the value to `0`, causing validation failures on listing retrieval.
- **Root Cause**: Property getter did not enforce a minimum baseline duration.
- **Resolution**: Updated `EstimatedDuration` property to clamp `DurationHours` with `Math.Max(1, ...)`.
- **Retest Evidence**: `ServiceListingDurationTests.cs` verified clamp behavior $\rightarrow$ Passed. Status: **RESOLVED**.
