# Ticket T1: Service Listing Direct Booking Flow

**Labels**: `wayfinder:task`, `closed`

## Question

How do we complete and validate the end-to-end Service Listing direct booking flow across ASP.NET Core (`POST /api/bookings`), React web app (`BookingModal.tsx`), and Flutter mobile app (`service_listing_details_screen.dart`)?

## Context & Key Artifacts

- **Backend API**: [`BookingController.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/Controllers/BookingController.cs) (`POST /api/bookings`)
- **Backend Service**: [`BookingService.cs`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.API/Services/BookingService.cs) (`CreateFromListingAsync`)
- **React UI**: [`BookingModal.tsx`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/web/src/components/public/BookingModal.tsx)
- **Flutter UI**: [`service_listing_details_screen.dart`](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/app/lib/screens/customer/service_listing_details_screen.dart)

## Resolution & Test Validation

1. **Flutter Booking Submission**:
   - Implemented `BookingRepository.createBookingFromListing` and wired `BookingProvider.createBookingFromListing`.
   - Replaced placeholder SnackBar in `service_listing_details_screen.dart` with `_BookingFormSheet` modal bottom sheet allowing date, time, and optional notes input.
   - Validated via `app/test/repositories_test.dart` and `app/test/booking_flow_test.dart`.
2. **Time Slot Collision Check**:
   - Verified backend check in `BookingService.CreateFromListingAsync` validating `ProviderAvailabilitySlots` and overlapping active bookings. Covered by 10 tests in `ListingBookingServiceTests.cs`.
3. **Status Assignment**:
   - Confirmed direct bookings transition to `Requested` status, persist slot reservations, generate initial fixed-price `Invoice` draft atomically, and dispatch real-time SignalR notifications.
4. **Validation & Errors**:
   - Implemented error handling and UI feedback across both Flutter (`ApiException` extraction to floating SnackBar & error banners) and React web app (`bookingApi.createFromListing` with error message alert banner).
   - Validated via `web/src/tests/components/public/BookingModal.test.tsx` and `web/src/tests/api/bookingContracts.test.ts`.
