# 04: Attach and Preview Photos in Reviews

**What to build:** Customers can select and attach photos of the completed service or repair when submitting or viewing reviews. Photos are uploaded to Azure Blob storage via backend multipart endpoint and rendered in review cards with interactive zoom previews.

**Blocked by:** 02: Submit New Review from Provider Profile

**Status:** completed

- [x] `POST /api/reviews/{id}/photos` is registered in `ApiEndpoints` and integrated into `ReviewRepository.uploadPhoto()`.
- [x] `WriteReviewBottomSheet` includes an "Add Photos" button leveraging `image_picker` to select work photos from camera or gallery.
- [x] Selected photo thumbnails render inside the bottom sheet with a delete badge to remove before submitting.
- [x] Upon review creation, attached images are automatically uploaded sequentially to `/api/reviews/{id}/photos`.
- [x] `ReviewCard` renders a horizontal scrollable thumbnail gallery when `review.photoUrls` is not empty.
- [x] Tapping any photo thumbnail opens a full-screen image viewer dialog with zoom and dismissal gestures.
- [x] Unit and widget tests verify multipart upload call handling and thumbnail gallery rendering.
