# 08: Booking Detail Post-Review Submission Confirmation State

**What to build:** When a customer completes a review from the completed booking prompt card, await the bottom sheet result, save the submitted rating, and transition the prompt card into a "Review Submitted" confirmation state showing the rating given.

**Blocked by:** None (can start immediately)

**Status:** complete

- [x] `BookingDetailScreen` awaits result from `WriteReviewBottomSheet.show(...)`.
- [x] If review submission succeeds, the screen updates state to record the submitted rating.
- [x] The review prompt card smoothly transitions to a "Review Submitted" card showing a check icon, positive confirmation text, and the customer's submitted star rating.
- [x] Automated widget tests verify the transition from prompt CTA to "Review Submitted" confirmation upon review creation.
