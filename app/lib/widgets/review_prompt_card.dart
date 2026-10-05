import 'package:flutter/material.dart';
import '../core/constants/colors.dart';
import 'star_rating_display.dart';
import 'write_review_bottom_sheet.dart';

/// Reusable post-job review prompt card with seamless transition
/// into a "Review Submitted" confirmation state upon feedback submission.
class ReviewPromptCard extends StatefulWidget {
  final String providerId;
  final String providerName;
  final Key? buttonKey;
  final String? buttonLabel;
  final ValueChanged<int>? onSubmitted;
  final int? initialRating;

  const ReviewPromptCard({
    super.key,
    required this.providerId,
    required this.providerName,
    this.buttonKey,
    this.buttonLabel,
    this.onSubmitted,
    this.initialRating,
  });

  @override
  State<ReviewPromptCard> createState() => _ReviewPromptCardState();
}

class _ReviewPromptCardState extends State<ReviewPromptCard> {
  int? _rating;

  @override
  void initState() {
    super.initState();
    _rating = widget.initialRating;
  }

  @override
  Widget build(BuildContext context) {
    if (_rating != null) {
      return Container(
        key: const Key('review_submitted_confirmation_card'),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF4),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFBBF7D0)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A000000),
              blurRadius: 10,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                color: Color(0xFFDCFCE7),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 28),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Review Submitted',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Thank you for rating your specialist!',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 6),
                  StarRatingDisplay(rating: _rating!, size: 16),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.shade300),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.star_rounded, color: Colors.amber, size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'How was your service?',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Leave verified feedback to help other customers.',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            key: widget.buttonKey ?? const Key('rate_specialist_button'),
            onPressed: () async {
              final submitted = await WriteReviewBottomSheet.show(
                context,
                providerId: widget.providerId,
                providerName: widget.providerName,
                onSubmitted: (newRating) {
                  if (mounted) {
                    setState(() {
                      _rating = newRating;
                    });
                  }
                  widget.onSubmitted?.call(newRating);
                },
              );
              if (submitted == true && mounted && _rating == null) {
                setState(() {
                  _rating = 5;
                });
                widget.onSubmitted?.call(5);
              }
            },
            icon: const Icon(Icons.rate_review_outlined, size: 18),
            label: Text(widget.buttonLabel ?? 'Rate & Review Specialist'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
          ),
        ],
      ),
    );
  }
}
