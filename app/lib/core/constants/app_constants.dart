import 'package:flutter/material.dart';

/// App-wide constants, default trade categories, and status helpers.
class AppConstants {
  AppConstants._();

  static const String appName = 'Handee';
  static const String appTagline = 'Verified Tradespeople Across Sri Lanka';

  // Common Trade Categories in Sri Lanka
  static const List<Map<String, dynamic>> serviceCategories = [
    {
      'id': 'plumbing',
      'name': 'Plumbing',
      'icon': Icons.plumbing,
      'desc': 'Pipes, leaks, taps, bathroom & drainage fixes',
      'priceRange': 'Rs. 2,500 - Rs. 8,000',
    },
    {
      'id': 'electrical',
      'name': 'Electrical',
      'icon': Icons.electrical_services,
      'desc': 'Wiring, switches, breakers, fan & light repairs',
      'priceRange': 'Rs. 3,000 - Rs. 10,000',
    },
    {
      'id': 'ac_repair',
      'name': 'AC Repair & Service',
      'icon': Icons.ac_unit,
      'desc': 'Cleaning, gas refill, cooling issues, installation',
      'priceRange': 'Rs. 4,500 - Rs. 12,000',
    },
    {
      'id': 'carpentry',
      'name': 'Carpentry',
      'icon': Icons.handyman,
      'desc': 'Door repairs, furniture, locks, custom shelving',
      'priceRange': 'Rs. 3,500 - Rs. 9,500',
    },
    {
      'id': 'painting',
      'name': 'Painting',
      'icon': Icons.format_paint,
      'desc': 'Interior, exterior, touch-ups, waterproofing',
      'priceRange': 'Rs. 5,000 - Rs. 25,000',
    },
    {
      'id': 'masonry',
      'name': 'Masonry & Tiling',
      'icon': Icons.foundation,
      'desc': 'Tile replacement, wall cracks, plastering, cement',
      'priceRange': 'Rs. 4,000 - Rs. 15,000',
    },
    {
      'id': 'roofing',
      'name': 'Roofing & Gutters',
      'icon': Icons.roofing,
      'desc': 'Roof leak prevention, gutter clearing & repair',
      'priceRange': 'Rs. 4,000 - Rs. 14,000',
    },
    {
      'id': 'appliance',
      'name': 'Appliance Repair',
      'icon': Icons.kitchen,
      'desc': 'Washing machines, fridges, microwave ovens',
      'priceRange': 'Rs. 3,500 - Rs. 12,000',
    },
  ];

  // Urgency levels
  static const List<String> urgencyLevels = [
    'Low',
    'Medium',
    'High',
    'Emergency',
  ];

  // Sri Lanka major districts / service areas
  static const List<String> serviceLocations = [
    'Colombo (Colombo 1-15, Rajagiriya, Battaramulla)',
    'Dehiwala - Mount Lavinia',
    'Nugegoda & Maharagama',
    'Kotte & Pelawatta',
    'Gampaha & Kadawatha',
    'Negombo & Katunayake',
    'Kandy City & Peradeniya',
    'Galle City & Unawatuna',
  ];
}
