# Ticket T2: Provider Availability Calendar & Time-Slot Management

**Labels**: `wayfinder:task`, `closed`

## Question

How do we build and connect Provider Availability Calendar management across Backend CRUD (`/api/provider-availability`), React Provider Portal, and Flutter booking UI?

## Context & Key Artifacts

- **Specification**: [`docs/specs/provider-availability-calendar-and-slots-spec.md`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/docs/specs/provider-availability-calendar-and-slots-spec.md) (`ready-for-agent`)
- **Backend API**: [`ProviderAvailabilityController.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/Controllers/ProviderAvailabilityController.cs)
- **Backend Service**: [`ProviderAvailabilityService.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/Services/ProviderAvailabilityService.cs)
- **Entities & DTOs**: [`ProviderAvailabilitySlot.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/Entities/ProviderAvailabilitySlot.cs), [`BatchCreateSlotsDto.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/DTO/BatchCreateSlotsDto.cs), [`RecurringScheduleDto.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/DTO/RecurringScheduleDto.cs)
- **React UI**: [`ProviderAvailability.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/pages/provider/ProviderAvailability.tsx), [`BookingModal.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/components/public/BookingModal.tsx)
- **Flutter UI**: [`provider_availability_slot_picker.dart`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/app/lib/widgets/provider_availability_slot_picker.dart), [`service_listing_details_screen.dart`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/app/lib/screens/customer/service_listing_details_screen.dart)

## Resolution & Test Validation

1. **Backend Availability Engine & Routing**:
   - Standardized route on `/api/provider-availability` and allowed public anonymous queries for `GET /api/provider-availability/{providerId}` with date range filtering (`startDate`, `endDate`).
   - Implemented `CreateBatchSlotsAsync` and `CreateRecurringSlotsAsync` with transactional collision checking and validation against existing provider slots.
   - Enhanced `GetForProviderAsync` to filter out past slots (`StartTime >= DateTimeOffset.UtcNow`), unbooked slots, and slots colliding with active bookings (`Requested`, `Accepted`, `InProgress`).
   - Validated via 22 tests in [`ProviderAvailabilityServiceTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Providers/ProviderAvailabilityServiceTests.cs) and [`ProviderAvailabilityControllerTests.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Tests/Providers/ProviderAvailabilityControllerTests.cs).

2. **React Provider Availability Management Portal**:
   - Added `web/src/api/providerAvailability.ts` with type-safe methods (`getForProvider`, `getMine`, `create`, `createBatch`, `createRecurring`, `delete`).
   - Built `ProviderAvailability.tsx` page providing date grouping, filter tabs ("All Slots", "Available", "Booked"), single slot creation modal, weekly recurring timetable generator modal, and unbooked slot deletion.
   - Registered `/provider/availability` route in `App.tsx` and added "Availability" to provider navigation in `AppShell.tsx`.
   - Enhanced `BookingModal.tsx` to fetch provider availability slots, render interactive slot chips, and bind selected slot start times.
   - Validated via 73 web tests including [`ProviderAvailability.test.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/tests/pages/provider/ProviderAvailability.test.tsx) and [`BookingModal.test.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/tests/components/public/BookingModal.test.tsx).

3. **Flutter Mobile Slot Picker Widget**:
   - Implemented `ProviderAvailabilitySlotModel` and `ProviderAvailabilityRepository`.
   - Created `ProviderAvailabilitySlotPicker` supporting horizontal day selection, time slot chips with active selection highlight, and graceful fallback when no slots are predefined.
   - Integrated slot picker into `_BookingFormSheet` within `service_listing_details_screen.dart`.
   - Validated via 26 tests in [`provider_availability_test.dart`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/app/test/provider_availability_test.dart), `booking_flow_test.dart`, and `repositories_test.dart`.
