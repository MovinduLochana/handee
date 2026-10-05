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
        bg = AppColors.infoLight;
        text = AppColors.secondary;
        label = 'In Progress';
        break;
      case 'completed':
      case 'paid':
      case 'succeeded':
        bg = AppColors.successLight;
        text = AppColors.success;
        label = status.toLowerCase() == 'completed' ? 'Completed' : (status.toLowerCase() == 'paid' ? 'Paid' : 'Payment Succeeded');
        break;
      case 'issued':
        bg = AppColors.primaryUltraLight;
        text = AppColors.primary;
        label = 'Invoice Ready';
        break;
      case 'overdue':
      case 'failed':
        bg = AppColors.errorLight;
        text = AppColors.error;
        label = status.toLowerCase() == 'failed' ? 'Payment Failed' : 'Overdue';
        break;
      case 'disputed':
        bg = AppColors.errorLight;
        text = AppColors.error;
        label = 'Disputed';
        break;
      case 'declined':
      case 'rejected':
        bg = AppColors.errorLight;
        text = AppColors.error;
        label = status.toLowerCase() == 'rejected' ? 'Rejected' : 'Declined';
        break;
      case 'cancelled':
      case 'canceled':
        bg = AppColors.errorLight;
        text = AppColors.error;
        label = 'Cancelled';
        break;
      case 'expired':
        bg = AppColors.borderLight;
        text = AppColors.textSecondary;
        label = 'Expired';
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
