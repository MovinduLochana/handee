import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../core/constants/colors.dart';

/// Encapsulates the user-selected location containing coordinates and formatted address.
class LocationResult {
  final String address;
  final double latitude;
  final double longitude;

  const LocationResult({
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  @override
  String toString() => address;
}

/// Fullscreen interactive Google Map location picker allowing customers to pin their exact
/// on-site service destination, detect GPS coordinates, and confirm street-level details.
class LocationPickerScreen extends StatefulWidget {
  final double? initialLatitude;
  final double? initialLongitude;
  final String? initialAddress;

  const LocationPickerScreen({
    super.key,
    this.initialLatitude,
    this.initialLongitude,
    this.initialAddress,
  });

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  // Default coordinates: Colombo Central, Sri Lanka
  static const LatLng _defaultLocation = LatLng(6.9271, 79.8612);

  final Completer<GoogleMapController> _controllerCompleter = Completer<GoogleMapController>();
  late LatLng _currentCenter;
  final TextEditingController _detailController = TextEditingController();
  
  String _detectedAddress = 'Locating position...';
  bool _isGeocoding = false;
  bool _isLocating = false;
  final bool _mapError = false;
  int _geocodeGeneration = 0;

  @override
  void initState() {
    super.initState();
    _currentCenter = (widget.initialLatitude != null && widget.initialLongitude != null)
        ? LatLng(widget.initialLatitude!, widget.initialLongitude!)
        : _defaultLocation;

    if (widget.initialAddress != null && widget.initialAddress!.isNotEmpty) {
      _detectedAddress = widget.initialAddress!;
    } else {
      _reverseGeocode(_currentCenter);
    }
  }

  @override
  void dispose() {
    _detailController.dispose();
    super.dispose();
  }

  Future<void> _reverseGeocode(LatLng target) async {
    final generation = ++_geocodeGeneration;

    if (kIsWeb) {
      // Basic formatting fallback on web
      if (mounted && _geocodeGeneration == generation) {
        setState(() {
          _detectedAddress = 'Lat: ${target.latitude.toStringAsFixed(4)}, Lng: ${target.longitude.toStringAsFixed(4)}';
        });
      }
      return;
    }

    if (!mounted) return;
    setState(() => _isGeocoding = true);
    try {
      final placemarks = await Geocoding().placemarkFromCoordinates(target.latitude, target.longitude);
      if (placemarks.isNotEmpty && mounted && _geocodeGeneration == generation) {
        final place = placemarks.first;
        final parts = <String>[
          if (place.street != null && place.street!.trim().isNotEmpty) place.street!,
          if (place.subLocality != null && place.subLocality!.trim().isNotEmpty) place.subLocality!,
          if (place.locality != null && place.locality!.trim().isNotEmpty) place.locality!,
          if (place.administrativeArea != null && place.administrativeArea!.trim().isNotEmpty) place.administrativeArea!,
        ];
        setState(() {
          _detectedAddress = parts.isNotEmpty ? parts.join(', ') : 'Selected Coordinates (${target.latitude.toStringAsFixed(4)}, ${target.longitude.toStringAsFixed(4)})';
        });
      }
    } catch (_) {
      if (mounted && _geocodeGeneration == generation) {
        setState(() {
          _detectedAddress = 'Lat: ${target.latitude.toStringAsFixed(4)}, Lng: ${target.longitude.toStringAsFixed(4)}';
        });
      }
    } finally {
      if (mounted && _geocodeGeneration == generation) {
        setState(() => _isGeocoding = false);
      }
    }
  }

  Future<void> _locateUser() async {
    setState(() => _isLocating = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enable GPS location services on your device.')),
          );
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Location permission is needed to pinpoint your address. Please allow access.')),
            );
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location access is disabled. Please open device Settings to allow access.')),
          );
        }
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      final newTarget = LatLng(position.latitude, position.longitude);
      _currentCenter = newTarget;

      if (_controllerCompleter.isCompleted) {
        final controller = await _controllerCompleter.future;
        await controller.animateCamera(CameraUpdate.newLatLngZoom(newTarget, 16.5));
      }

      await _reverseGeocode(newTarget);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not determine current location: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  void _confirmLocation() {
    final streetDetail = _detailController.text.trim();
    String finalAddress = '';

    if (streetDetail.isNotEmpty) {
      if (_detectedAddress.toLowerCase().contains(streetDetail.toLowerCase())) {
        finalAddress = _detectedAddress;
      } else {
        finalAddress = '$streetDetail, $_detectedAddress';
      }
    } else {
      finalAddress = _detectedAddress;
    }

    Navigator.of(context).pop(LocationResult(
      address: finalAddress,
      latitude: _currentCenter.latitude,
      longitude: _currentCenter.longitude,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Set Service Location', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 1,
        actions: [
          IconButton(
            icon: const Icon(Icons.check, color: AppColors.primary),
            onPressed: _confirmLocation,
            tooltip: 'Confirm',
          ),
        ],
      ),
      body: Stack(
        children: [
          // Interactive Google Map View
          if (!_mapError)
            GoogleMap(
              initialCameraPosition: CameraPosition(
                target: _currentCenter,
                zoom: 15.0,
              ),
              myLocationEnabled: true,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              compassEnabled: true,
              mapToolbarEnabled: false,
              onMapCreated: (controller) {
                if (!_controllerCompleter.isCompleted) {
                  _controllerCompleter.complete(controller);
                }
              },
              onCameraMove: (position) {
                _currentCenter = position.target;
              },
              onCameraIdle: () {
                _reverseGeocode(_currentCenter);
              },
            )
          else
            Container(
              color: Colors.grey.shade200,
              alignment: Alignment.center,
              child: const Text('Map preview unavailable. Use address input below.'),
            ),

          // Center Pin Needle (PickMe / Uber UI Pattern)
          Center(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 36.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryDark,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: const [
                        BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                      ],
                    ),
                    child: const Text(
                      'Service Point',
                      style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Icon(
                    Icons.location_on,
                    size: 42,
                    color: AppColors.primary,
                  ),
                  Container(
                    width: 8,
                    height: 4,
                    decoration: const BoxDecoration(
                      color: Colors.black38,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Floating GPS Locate Action Button
          Positioned(
            right: 16,
            bottom: 220,
            child: FloatingActionButton.small(
              heroTag: 'locate_me_btn',
              backgroundColor: Colors.white,
              foregroundColor: AppColors.primary,
              onPressed: _isLocating ? null : _locateUser,
              child: _isLocating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.my_location),
            ),
          ),

          // Bottom Location Card & Input
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 16,
                    offset: Offset(0, -4),
                  ),
                ],
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Address header
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.location_pin, color: AppColors.primary, size: 22),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _isGeocoding ? 'Detecting address...' : _detectedAddress,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Lat: ${_currentCenter.latitude.toStringAsFixed(4)}, Lng: ${_currentCenter.longitude.toStringAsFixed(4)}',
                                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // House / Building / Landmark detail
                    TextField(
                      controller: _detailController,
                      decoration: InputDecoration(
                        labelText: 'House no., apartment, or landmark (optional)',
                        hintText: 'e.g. No. 42, Temple Road, Apt 3B',
                        prefixIcon: const Icon(Icons.home_outlined, color: AppColors.textMuted, size: 20),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Confirm CTA
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _confirmLocation,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Confirm Location', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
