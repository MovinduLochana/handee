# 05: Edit and Delete Authored Reviews

**What to build:** Customers can edit their existing review's rating and comment or delete their review entirely. Deleting or editing a review dynamically updates the provider's aggregate rating and review count.

**Blocked by:** 02: Submit New Review from Provider Profile

**Status:** completed

- [x] `ApiClient` is updated to support HTTP `delete()` requests with authorization headers.
- [x] `PUT /api/reviews/{id}` and `DELETE /api/reviews/{id}` endpoints are added to `ApiEndpoints` and `ReviewRepository`.
- [x] `ReviewProvider` supports `updateReview()` and `deleteReview()` methods, optimistically updating local state and recalculating provider aggregate stats.
- [x] `ReviewCard` detects whether the current authenticated user owns the review (`isOwnReview`), rendering an options menu (Edit / Delete).
- [x] Editing opens `WriteReviewBottomSheet` populated with existing rating and comment.
- [x] Deleting triggers a confirmation dialog before sending the `DELETE` request.
- [x] Unit and widget tests verify `ApiClient.delete()`, review updates, and deletion flows.
