import 'package:flutter/material.dart';
import '../core/constants/colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color text;
    String label;

    switch (status.toLowerCase()) {
      case 'pending_ai_review':
      case 'pending':
        bg = AppColors.warningLight;
        text = AppColors.warning;
        label = 'AI Reviewing';
        break;
      case 'approved_for_auto_dispatch':
      case 'approved':
        bg = AppColors.primaryUltraLight;
        text = AppColors.primary;
        label = 'Auto Dispatched';
        break;
      case 'dispatched':
      case 'accepted':
        bg = AppColors.infoLight;
        text = AppColors.info;
        label = 'Provider Assigned';
        break;
      case 'inprogress':
      case 'in_progress':
        bg = const Color(0xFFEFF6FF);
        text = AppColors.secondary;
        label = 'In Progress';
        break;
      case 'completed':
        bg = AppColors.successLight;
        text = AppColors.success;
        label = 'Completed';
        break;
      case 'disputed':
        bg = AppColors.errorLight;
        text = AppColors.error;
        label = 'Disputed';
        break;
      default:
        bg = AppColors.borderLight;
        text = AppColors.textSecondary;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: text.withOpacity(0.2), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: text,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: text,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
