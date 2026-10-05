import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/constants/api_endpoints.dart';
import '../core/constants/colors.dart';
import '../data/models/review_model.dart';
import 'star_rating_display.dart';

class ReviewCard extends StatelessWidget {
  final ReviewModel review;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final bool isOwnReview;

  const ReviewCard({
    super.key,
    required this.review,
    this.onEdit,
    this.onDelete,
    this.isOwnReview = false,
  });

  String _getInitials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts[0].isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('MMM d, yyyy').format(review.createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.primaryUltraLight,
                backgroundImage: review.fullCustomerPhotoUrl != null
                    ? NetworkImage(review.fullCustomerPhotoUrl!)
                    : null,
                child: review.fullCustomerPhotoUrl == null
                    ? Text(
                        _getInitials(review.customerName),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryDark,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review.customerName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      dateStr,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              StarRatingDisplay(rating: review.rating, size: 18),
              if (isOwnReview || onEdit != null || onDelete != null) ...[
                const SizedBox(width: 4),
                PopupMenuButton<String>(
                  key: const Key('review_options_menu_button'),
                  icon: const Icon(Icons.more_vert, size: 20, color: AppColors.textMuted),
                  padding: EdgeInsets.zero,
                  onSelected: (action) {
                    if (action == 'edit') {
                      onEdit?.call();
                    } else if (action == 'delete') {
                      onDelete?.call();
                    }
                  },
                  itemBuilder: (context) => [
                    if (onEdit != null || isOwnReview)
                      const PopupMenuItem(
                        key: Key('review_edit_action'),
                        value: 'edit',
                        child: Row(
                          children: [
                            Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                            SizedBox(width: 8),
                            Text('Edit Review'),
                          ],
                        ),
                      ),
                    if (onDelete != null || isOwnReview)
                      const PopupMenuItem(
                        key: Key('review_delete_action'),
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                            SizedBox(width: 8),
                            Text('Delete Review', style: TextStyle(color: AppColors.error)),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
          if (review.comment != null && review.comment!.trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              review.comment!,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textPrimary,
                height: 1.45,
              ),
            ),
          ],
          if (review.fullPhotoUrls.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 72,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: review.fullPhotoUrls.length,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final url = review.fullPhotoUrls[index];
                  return GestureDetector(
                    key: Key('review_photo_thumbnail_$index'),
                    onTap: () => _openPhotoViewer(context, url),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        url,
                        width: 72,
                        height: 72,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          width: 72,
                          height: 72,
                          color: AppColors.primaryUltraLight,
                          child: const Icon(Icons.broken_image, size: 24, color: AppColors.textMuted),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _openPhotoViewer(BuildContext context, String imageUrl) {
    final fullUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
        ? imageUrl
        : '${ApiEndpoints.baseUrl}${imageUrl.startsWith('/') ? imageUrl : '/$imageUrl'}';

    showDialog(
      context: context,
      builder: (dialogCtx) => Dialog(
        backgroundColor: Colors.black87,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              minScale: 0.5,
              maxScale: 4.0,
              child: Image.network(
                fullUrl,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const Center(
                  child: Icon(Icons.broken_image, color: Colors.white, size: 48),
                ),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                key: const Key('photo_viewer_close_button'),
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.of(dialogCtx).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
