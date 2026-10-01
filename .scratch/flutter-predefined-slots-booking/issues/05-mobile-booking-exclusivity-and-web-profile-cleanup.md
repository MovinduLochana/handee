# 05: Mobile Booking Exclusivity & Web Profile Cleanup

**What to build:**
Enforce that customer bookings are initiated exclusively through service listings in the Flutter mobile application. Replace misleading direct-booking buttons across mobile and web profile screens, eliminating dead-end alert dialogs and unintentional redirects to generic job requests.

**Blocked by:** 03: Flutter Customer Booking UI — Date Strip & Predefined Slot Picker

**Status:** closed

- [x] On Flutter `public_provider_profile_screen.dart`, replace the bottom "Book this Pro" button (which redirected to `CreateJobScreen`) with a clean "Browse & Book Services" button that smoothly scrolls to the provider's active service listing cards.
- [x] On React web `PublicProviderProfile.tsx`, remove the non-functional sidebar button that triggers `alert("Booking flow not implemented.")`.
- [x] Display prominent download/open mobile app call-to-actions on web service listings for completing fixed-price bookings.
- [x] End-to-end integration and smoke tests verify that all customer booking pathways strictly anchor to active service listings on mobile.
