import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../core/constants/colors.dart';
import '../core/network/api_client.dart';
import '../data/models/review_model.dart';
import '../providers/review_provider.dart';
import 'star_rating_picker.dart';

class WriteReviewBottomSheet extends StatefulWidget {
  final String providerId;
  final String providerName;
  final List<XFile>? initialPhotos;
  final ImagePicker? imagePicker;
  final ReviewModel? existingReview;
  final ValueChanged<int>? onSubmitted;

  const WriteReviewBottomSheet({
    super.key,
    required this.providerId,
    required this.providerName,
    this.initialPhotos,
    this.imagePicker,
    this.existingReview,
    this.onSubmitted,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String providerId,
    required String providerName,
    List<XFile>? initialPhotos,
    ReviewModel? existingReview,
    ValueChanged<int>? onSubmitted,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => WriteReviewBottomSheet(
        providerId: providerId,
        providerName: providerName,
        initialPhotos: initialPhotos,
        existingReview: existingReview,
        onSubmitted: onSubmitted,
      ),
    );
  }

  @override
  State<WriteReviewBottomSheet> createState() => _WriteReviewBottomSheetState();
}

class _WriteReviewBottomSheetState extends State<WriteReviewBottomSheet> {
  final _commentController = TextEditingController();
  int _rating = 5;
  bool _isSubmitting = false;
  String? _localError;
  late final List<XFile> _selectedPhotos;
  late final ImagePicker _imagePicker;

  bool get isEditing => widget.existingReview != null;

  @override
  void initState() {
    super.initState();
    _rating = widget.existingReview?.rating ?? 5;
    if (widget.existingReview?.comment != null) {
      _commentController.text = widget.existingReview!.comment!;
    }
    _selectedPhotos = widget.initialPhotos != null
        ? List<XFile>.from(widget.initialPhotos!)
        : [];
    _imagePicker = widget.imagePicker ?? ImagePicker();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take Photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    try {
      final picked = await _imagePicker.pickImage(source: source, imageQuality: 80);
      if (picked != null && mounted) {
        setState(() {
          _selectedPhotos.add(picked);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not pick photo: $e')),
        );
      }
    }
  }

  Future<void> _submitReview() async {
    setState(() {
      _isSubmitting = true;
      _localError = null;
    });

    try {
      final reviewProv = Provider.of<ReviewProvider?>(context, listen: false);
      if (reviewProv != null) {
        if (isEditing) {
          await reviewProv.updateReviewWithPhotos(
            reviewId: widget.existingReview!.id,
            rating: _rating,
            comment: _commentController.text.trim(),
            photoPaths: _selectedPhotos.map((p) => p.path).toList(),
          );
        } else {
          await reviewProv.addReviewWithPhotos(
            providerId: widget.providerId,
            rating: _rating,
            comment: _commentController.text.trim(),
            photoPaths: _selectedPhotos.map((p) => p.path).toList(),
          );
        }
      }

      if (mounted) {
        widget.onSubmitted?.call(_rating);
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEditing
                ? 'Review updated successfully!'
                : 'Review submitted successfully! Thank you for your feedback.'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          if (e.statusCode == 409 || e.message.contains('already reviewed')) {
            _localError = 'You have already reviewed this provider.';
          } else {
            _localError = isEditing
                ? 'Failed to update review. Please try again.'
                : 'Failed to submit review. Please try again.';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          final msg = e.toString();
          if (msg.contains('already reviewed')) {
            _localError = 'You have already reviewed this provider.';
          } else {
            _localError = isEditing
                ? 'Failed to update review. Please try again.'
                : 'Failed to submit review. Please try again.';
          }
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(24, 20, 24, 24 + bottomInset),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              isEditing ? 'Edit Your Review' : 'Review ${widget.providerName}',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Your honest feedback helps the community choose verified professionals.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            Center(
              child: StarRatingPicker(
                initialRating: _rating,
                onRatingChanged: (newRating) {
                  setState(() {
                    _rating = newRating;
                  });
                },
              ),
            ),
            const SizedBox(height: 16),
            if (_localError != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.error.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, size: 20, color: AppColors.error),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _localError!,
                        style: const TextStyle(fontSize: 13, color: AppColors.error, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            TextField(
              key: const Key('review_comment_field'),
              controller: _commentController,
              maxLines: 4,
              maxLength: 1500,
              decoration: InputDecoration(
                hintText: 'Share details of your experience (cleanliness, punctuality, quality of work)...',
                hintStyle: const TextStyle(fontSize: 14, color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderLight),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderLight),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
                contentPadding: const EdgeInsets.all(16),
              ),
            ),
            const SizedBox(height: 16),

            // Photos attachment header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Attach Photos (${_selectedPhotos.length}/5)',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                if (_selectedPhotos.length < 5)
                  TextButton.icon(
                    key: const Key('review_add_photo_button'),
                    onPressed: _isSubmitting ? null : _pickPhoto,
                    icon: const Icon(Icons.add_a_photo_outlined, size: 16),
                    label: const Text('Add Photo', style: TextStyle(fontSize: 12)),
                  ),
              ],
            ),
            const SizedBox(height: 8),

            if (_selectedPhotos.isNotEmpty) ...[
              SizedBox(
                height: 72,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _selectedPhotos.length,
                  separatorBuilder: (context, index) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final photo = _selectedPhotos[i];
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(
                            File(photo.path),
                            width: 72,
                            height: 72,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              width: 72,
                              height: 72,
                              color: AppColors.primaryUltraLight,
                              child: const Icon(Icons.image, color: AppColors.primary),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 2,
                          right: 2,
                          child: GestureDetector(
                            key: Key('review_remove_photo_$i'),
                            onTap: () {
                              setState(() {
                                _selectedPhotos.removeAt(i);
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
            ],
            const SizedBox(height: 8),
            ElevatedButton(
              key: const Key('submit_review_button'),
              onPressed: _isSubmitting ? null : _submitReview,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 0,
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      isEditing ? 'Update Review' : 'Submit Review',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
