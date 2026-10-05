# 07: Star Rating Drag Gesture Interaction

**What to build:** Allow customers to drag or slide across the star rating bar in addition to tapping, with fluid real-time visual feedback selecting ratings from 1 to 5.

**Blocked by:** None (can start immediately)

**Status:** complete

- [x] `StarRatingPicker` supports horizontal drag gestures (`onHorizontalDragUpdate` / `onHorizontalDragStart`).
- [x] Dragging horizontally computes the targeted star index (1 to 5) based on touch coordinate and total bar width.
- [x] Tapping individual stars continues to select 1 to 5 stars.
- [x] Callback `onRatingChanged` fires when the rating changes.
- [x] Automated widget tests verify drag gestures update the selected star rating.
