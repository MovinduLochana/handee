# 02: Customer Service Listing Booking Flow

**What to build:** An end-to-end booking path allowing customers to browse published Service Listings and book a chosen date and time slot with a verified provider. The platform checks provider schedule availability, creates a confirmed or requested booking linked to the listing, automatically generates a fixed-price invoice, and makes the booking visible in both customer and provider queues.

**Blocked by:** 01: Architecture Normalization & Standards Prefactoring

**Status:** closed

- [x] Customers can initiate a booking against an active Service Listing by providing a desired schedule time and optional service notes.
- [x] Attempting to book an inactive or non-existent listing returns a clear client error.
- [x] Attempting to book a time slot when the provider is unavailable or already has an active overlapping booking is rejected with a validation conflict.
- [x] A successful listing booking persists a `Booking` record with valid references to the listing, provider, customer, and schedule.
- [x] Booking a listing automatically triggers generation of an itemized `Invoice` reflecting the listing's fixed price and platform fee breakdown.
- [x] The booked appointment appears in the customer's active bookings list and the provider's incoming bookings queue.
- [x] Positive booking creation and collision/validation failure paths are verified by automated tests.
