import 'package:flutter/material.dart';

/// Design tokens and color palette for Handee mobile application.
///
/// Based on the Handee neutral blue-green design palette.
class AppColors {
  AppColors._();

  // ─────────────────────────────────────────────
  // Primary brand colors
  // ─────────────────────────────────────────────

  static const Color primary = Color(0xFF4D6970);
  static const Color primaryLight = Color(0xFF748B88);
  static const Color primaryDark = Color(0xFF2F4858);
  static const Color primaryUltraLight = Color(0xFFE3E8E6);

  // ─────────────────────────────────────────────
  // Secondary & Accents
  // ─────────────────────────────────────────────

  static const Color accent = Color(0xFF748B88);
  static const Color secondary = Color(0xFF2F4858);

  // ─────────────────────────────────────────────
  // Status & Semantic Colors
  // ─────────────────────────────────────────────

  // Kept distinct from the brand palette for clear status feedback.
  static const Color success = Color(0xFF3F7D68);
  static const Color successLight = Color(0xFFE8F0ED);

  static const Color warning = Color(0xFF9A7B32);
  static const Color warningLight = Color(0xFFF5F0DF);

  static const Color error = Color(0xFFB85454);
  static const Color errorLight = Color(0xFFF7EAEA);

  static const Color info = Color(0xFF4D6970);
  static const Color infoLight = Color(0xFFE8EDEC);

  // ─────────────────────────────────────────────
  // Neutral / Brand Palette
  // ─────────────────────────────────────────────

  /// Darkest color in the palette.
  static const Color textPrimary = Color(0xFF2F4858);

  /// Secondary text.
  static const Color textSecondary = Color(0xFF748B88);

  /// Muted / placeholder text.
  static const Color textMuted = Color(0xFFA0ADA4);

  /// Standard border.
  static const Color border = Color(0xFFCDCFC7);

  /// Subtle border.
  static const Color borderLight = Color(0xFFE5E5E0);

  /// Main surface.
  static const Color surface = Color(0xFFFFFFFF);

  /// Elevated/subtle surface.
  static const Color surfaceElevated = Color(0xFFF6F4F0);

  /// Main application background.
  static const Color background = Color(0xFFF6F4F0);

  /// Card shadow.
  static const Color cardShadow = Color(0x142F4858);

  // ─────────────────────────────────────────────
  // Urgency Badge Colors
  // ─────────────────────────────────────────────

  static const Color urgencyLow = Color(0xFF3F7D68);
  static const Color urgencyMedium = Color(0xFF4D6970);
  static const Color urgencyHigh = Color(0xFF9A7B32);
  static const Color urgencyEmergency = Color(0xFFB85454);
}