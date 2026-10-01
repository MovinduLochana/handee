# 03: Flutter Customer Booking UI — Date Strip & Predefined Slot Picker

**What to build:**
A streamlined, native customer booking interface in the Flutter mobile application where a customer picks a date from a 14-day horizontal calendar strip and selects from predefined hourly slot chips. Eliminates the confusing duplicate date/time picker dialogs and legacy database slot pickers, providing immediate feedback on multi-hour slot consumption and submitting direct bookings seamlessly.

**Blocked by:** 02: Dynamic Predefined 1-Hour Slot Engine & Overlap Validation

**Status:** closed

- [x] Replaces legacy `ProviderAvailabilitySlotPicker` and redundant `_pickDate`/`_pickTime` dialogs in `service_listing_details_screen.dart` with a cohesive date-and-slot booking flow.
- [x] Features a 14-day horizontal Date Strip showing day name, date, and month, with auto-fetch of predefined slots on date selection.
- [x] Renders interactive Predefined Time Slot chips indicating available, booked, and past states.
- [x] For multi-hour services ($N > 1$), selecting a start hour renders an unambiguous multi-slot reservation confirmation banner (e.g., *"Window: 10:00 AM – 12:00 PM (2 Slots)"*).
- [x] Submits the booking with the selected slot's timestamp via `BookingRepository` and navigates smoothly to booking tracking/details upon 201 Created.
- [x] Widget and flow tests verify date strip interaction, slot selection state, and error handling.
