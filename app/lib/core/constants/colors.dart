import 'package:flutter/material.dart';

/// Design tokens and color palette for Handee mobile application.
/// Aligned with the React Web Portal's bold Royal Blue design system.
class AppColors {
  AppColors._();

  // Primary brand colors
  static const Color primary = Color(0xFF2563EB); // Royal Blue
  static const Color primaryLight = Color(0xFF60A5FA);
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color primaryUltraLight = Color(0xFFEFF6FF);

  // Secondary & Accents
  static const Color accent = Color(0xFF0D9488); // Teal
  static const Color secondary = Color(0xFF4F46E5); // Indigo

  // Status & semantic colors
  static const Color success = Color(0xFF10B981); // Emerald
  static const Color successLight = Color(0xFFECFDF5);
  static const Color warning = Color(0xFFF59E0B); // Amber
  static const Color warningLight = Color(0xFFFFFBEB);
  static const Color error = Color(0xFFEF4444); // Red
  static const Color errorLight = Color(0xFFFEF2F2);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFEFF6FF);

  // Neutral slate palette
  static const Color textPrimary = Color(0xFF0F172A); // Slate 900
  static const Color textSecondary = Color(0xFF475569); // Slate 600
  static const Color textMuted = Color(0xFF94A3B8); // Slate 400
  static const Color border = Color(0xFFE2E8F0); // Slate 200
  static const Color borderLight = Color(0xFFF1F5F9); // Slate 100
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFF8FAFC); // Slate 50
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardShadow = Color(0x0F0F172A);

  // Urgency badge colors
  static const Color urgencyLow = Color(0xFF10B981);
  static const Color urgencyMedium = Color(0xFF3B82F6);
  static const Color urgencyHigh = Color(0xFFF59E0B);
  static const Color urgencyEmergency = Color(0xFFEF4444);
}
