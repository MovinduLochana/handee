import 'package:flutter/material.dart';
import '../core/constants/colors.dart';

class UrgencyBadge extends StatelessWidget {
  final String urgency;

  const UrgencyBadge({super.key, required this.urgency});

  @override
  Widget build(BuildContext context) {
    Color color;
    IconData icon;

    switch (urgency.toLowerCase()) {
      case 'emergency':
        color = AppColors.urgencyEmergency;
        icon = Icons.bolt;
        break;
      case 'high':
        color = AppColors.urgencyHigh;
        icon = Icons.priority_high;
        break;
      case 'low':
        color = AppColors.urgencyLow;
        icon = Icons.low_priority;
        break;
      case 'medium':
      default:
        color = AppColors.urgencyMedium;
        icon = Icons.timer_outlined;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(
            urgency,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
