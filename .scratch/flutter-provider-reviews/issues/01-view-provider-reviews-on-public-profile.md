# 01: View Provider Reviews on Public Profile

**What to build:** Customers and providers can view verified customer feedback, star ratings, and review timestamps when viewing a provider's public profile in the mobile app.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] `GET /api/providers/{providerId}/reviews` is registered in `ApiEndpoints` and fetched via `ReviewRepository`.
- [x] `ReviewModel` accurately parses provider reviews from API payloads with customer name, rating, comment, photos, and formatted timestamps.
- [x] `ReviewProvider` manages review state, pagination, and caching per provider profile.
- [x] `PublicProviderProfileScreen` displays a dedicated "Customer Reviews" section with summary count and star badge.
- [x] Each review renders in a `ReviewCard` showing reviewer avatar, name, stars, date, and review comment.
- [x] Empty state ("No Reviews Yet") and loading skeletons/shimmers render gracefully when appropriate.
- [x] Unit and widget tests verify parsing, repository fetches, and UI rendering.
