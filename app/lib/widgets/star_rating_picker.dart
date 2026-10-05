import 'package:flutter/material.dart';
import '../core/constants/colors.dart';

class StarRatingPicker extends StatefulWidget {
  final int initialRating;
  final ValueChanged<int> onRatingChanged;
  final double size;

  const StarRatingPicker({
    super.key,
    this.initialRating = 5,
    required this.onRatingChanged,
    this.size = 36,
  });

  @override
  State<StarRatingPicker> createState() => _StarRatingPickerState();
}

class _StarRatingPickerState extends State<StarRatingPicker> {
  late int _currentRating;
  final GlobalKey _rowKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _currentRating = widget.initialRating;
  }

  @override
  void didUpdateWidget(covariant StarRatingPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialRating != widget.initialRating) {
      _currentRating = widget.initialRating;
    }
  }

  void _updateRatingFromOffset(Offset localPosition) {
    final box = _rowKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || box.size.width <= 0) return;
    final starWidth = box.size.width / 5;
    final calculated = (localPosition.dx / starWidth).ceil().clamp(1, 5);
    if (calculated != _currentRating) {
      setState(() {
        _currentRating = calculated;
      });
      widget.onRatingChanged(calculated);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onHorizontalDragStart: (details) => _updateRatingFromOffset(details.localPosition),
      onHorizontalDragUpdate: (details) => _updateRatingFromOffset(details.localPosition),
      child: Row(
        key: _rowKey,
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(5, (index) {
          final starValue = index + 1;
          final isSelected = starValue <= _currentRating;

          return IconButton(
            key: Key('star_rating_$starValue'),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            constraints: const BoxConstraints(),
            iconSize: widget.size,
            icon: Icon(
              isSelected ? Icons.star_rounded : Icons.star_outline_rounded,
              color: isSelected ? Colors.amber : AppColors.border,
            ),
            onPressed: () {
              setState(() {
                _currentRating = starValue;
              });
              widget.onRatingChanged(starValue);
            },
            tooltip: '$starValue Star${starValue > 1 ? 's' : ''}',
          );
        }),
      ),
    );
  }
}

