# 09: Review Provider Architecture Hardening & Aggregate Recalculation

**What to build:** Move multi-photo submission orchestration from UI into `ReviewProvider.addReviewWithPhotos(...)` (eliminating UI feature envy), deduplicate cache updates and payload builders, and dynamically recalculate provider average ratings and counts upon review add, edit, or delete.

**Blocked by:** None (can start immediately)

**Status:** complete

- [x] `ReviewRepository` deduplicates payload creation via a private helper `_buildReviewPayload`.
- [x] `ReviewProvider` deduplicates local cache replacement via `_updateCachedReview(ReviewModel updated)`.
- [x] `ReviewProvider` exposes `addReviewWithPhotos(...)` to encapsulate sequential photo uploads and error logging, keeping `WriteReviewBottomSheet` clean.
- [x] `ReviewProvider` dynamically recalculates or exposes average rating and review count for a provider based on cached reviews after additions, edits, or deletions.
- [x] Unit tests verify `addReviewWithPhotos`, deduplicated updates, and aggregate recalculation.
