# 03: Post-Job Review Flow on Completed Bookings

**What to build:** When a job booking reaches completed status (`booking.isCompleted`), customers visiting `BookingDetailScreen` or tracking the booking in `BookingTrackerScreen` see an interactive "Rate & Review Your Specialist" banner prompting them to review the service provider.

**Blocked by:** 02: Submit New Review from Provider Profile

**Status:** completed

- [x] `BookingDetailScreen` checks if `booking.isCompleted` and user is customer, rendering a prominent review prompt card.
- [x] Tapping the review prompt launches `WriteReviewBottomSheet` pre-populated with the provider profile ID and specialist name.
- [x] After review creation, the prompt card switches to a "Review Submitted" confirmation state showing the rating given.
- [x] `BookingTrackerScreen` celebration/completion state includes a direct action button to rate and review the provider.
- [x] Unit and widget tests verify the post-completion review CTA rendering and navigation on both screens.
