# 02: Dynamic Predefined 1-Hour Slot Engine & Overlap Validation

**What to build:**
A dynamic availability engine that projects predefined 1-hour appointment slots (`08:00 AM - 09:00 AM`, `09:00 AM - 10:00 AM`, etc.) on demand for any requested date and service duration by subtracting existing active bookings from the provider's operating hours. Hardens the booking service to validate top-of-hour alignment, daily closing bounds, and contiguous slot availability within an isolated database transaction to eliminate double-booking race conditions.

**Blocked by:** 01: Integer-Hour Service Listings & Declarative Operating Hours

**Status:** closed

- [x] `GET /api/provider-availability/slots` returns canonical predefined 1-hour slots for a given provider, date, and `durationHours`.
- [x] Predefined slots report clear availability states (`isAvailable: true/false`) and reasons (`"Booked"`, `"OutsideHours"`, `"InsufficientTime"`, `"Past"`).
- [x] Multi-hour service listings ($N$ hours) only present start hours that have $N$ contiguous free slots before the provider's daily closing time.
- [x] `BookingService.CreateFromListingAsync` enforces top-of-hour start times (`Minute == 0`) and verifies contiguous availability inside a database transaction to prevent double bookings.
- [x] Unit and integration tests verify dynamic slot calculation, past-time filtering, closing-time cutoff, and rejection of conflicting overlapping appointments.
