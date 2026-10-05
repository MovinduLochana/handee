# 02: Submit New Review from Provider Profile

**What to build:** Authenticated customers can tap "Write a Review" on a provider's public profile, select a 1–5 star rating, enter a written review (up to 1500 characters), and submit it. The review immediately updates the provider's review list and aggregate star rating.

**Blocked by:** 01: View Provider Reviews on Public Profile

**Status:** completed

- [x] `POST /api/providers/{providerId}/reviews` is registered in `ApiEndpoints` and callable via `ReviewRepository.addReview()`.
- [x] Interactive `StarRatingPicker` widget allows customers to tap or drag to choose 1 to 5 stars with visual feedback.
- [x] `WriteReviewBottomSheet` or dialog captures 1–5 star rating, text comment, character counter, and handles submit/cancel actions.
- [x] Successfully submitting a review adds it to the active provider's review list and triggers provider aggregate rating refresh.
- [x] If the customer has already reviewed this provider, backend `409 Conflict` is caught and displayed cleanly with an informative message.
- [x] Only authenticated users with customer status can view or trigger the "Write a Review" action.
- [x] Unit and widget tests verify submission flow, validation, and 409 Conflict handling.
