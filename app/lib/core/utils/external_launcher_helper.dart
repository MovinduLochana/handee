import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Centralized utility for launching external intents such as phone dialers
/// and map navigation with robust validation, URI formatting, and graceful UI fallbacks.
class ExternalLauncherHelper {
  /// Optional hook for tests to mock url launching behavior.
  static Future<bool> Function(Uri uri, {LaunchMode mode})? urlLauncherOverride;

  /// Normalizes and launches a telephone call intent via `tel:`.
  /// Returns `true` if launched successfully, `false` otherwise.
  static Future<bool> launchPhoneCall(BuildContext context, String? rawPhone) async {
    if (rawPhone == null || rawPhone.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Customer phone number is not available'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return false;
    }

    // Clean phone number: keep leading +, digits, remove spaces and dashes
    final trimmed = rawPhone.trim();
    final hasLeadingPlus = trimmed.startsWith('+');
    final digitsOnly = trimmed.replaceAll(RegExp(r'[^\d]'), '');
    final cleanPhone = hasLeadingPlus ? '+$digitsOnly' : digitsOnly;

    if (cleanPhone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid customer phone number format'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return false;
    }

    final uri = Uri(scheme: 'tel', path: cleanPhone);
    try {
      final launcher = urlLauncherOverride ?? launchUrl;
      final launched = await launcher(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open dialer for $cleanPhone'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return launched;
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error launching dialer: $e'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return false;
    }
  }

  /// Builds a map navigation query and opens the external map app.
  /// Prefers exact latitude/longitude coordinates if provided for pin-point accuracy.
  /// Falls back to address text search query if coordinates are absent.
  /// Returns `true` if launched successfully, `false` otherwise.
  static Future<bool> launchMapNavigation(
    BuildContext context,
    String? addressQuery, {
    double? latitude,
    double? longitude,
  }) async {
    final hasCoords = latitude != null && longitude != null;
    final hasAddress = addressQuery != null && addressQuery.trim().isNotEmpty;

    if (!hasCoords && !hasAddress) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Service location is not specified'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return false;
    }

    final query = hasCoords ? '$latitude,$longitude' : Uri.encodeComponent(addressQuery!.trim());
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$query');

    try {
      final launcher = urlLauncherOverride ?? launchUrl;
      final launched = await launcher(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open map navigation application'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return launched;
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening maps: $e'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return false;
    }
  }
}
