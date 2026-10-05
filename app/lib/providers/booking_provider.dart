import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../data/models/booking_model.dart';
import '../data/repositories/booking_repository.dart';

class BookingProvider extends ChangeNotifier {
  final BookingRepository repository;

  List<BookingModel> _bookings = [];
  List<BookingModel> _pendingRequests = [];
  BookingModel? _selectedBooking;
  bool _isLoading = false;
  String? _errorMessage;

  BookingProvider({required this.repository});

  List<BookingModel> get bookings => _bookings;
  List<BookingModel> get pendingRequests => _pendingRequests;
  BookingModel? get selectedBooking => _selectedBooking;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<BookingModel> get activeBookings =>
      _bookings.where((b) => b.isAccepted || b.isInProgress).toList();

  List<BookingModel> get pendingBookings =>
      _bookings.where((b) => b.isRequested).toList();

  List<BookingModel> get completedBookings =>
      _bookings.where((b) => b.isCompleted).toList();

  List<BookingModel> get declinedBookings =>
      _bookings.where((b) => b.isDeclined).toList();

  List<BookingModel> get disputedBookings =>
      _bookings.where((b) => b.isDisputed).toList();

  // -----------------------------------------------------------
  // Instant Match Domain (On-Demand Dispatches)
  // -----------------------------------------------------------
  List<BookingModel> get instantJobs =>
      _bookings.where((b) => b.isInstantMatch).toList();

  List<BookingModel> get activeInstantJobs =>
      _bookings.where((b) => b.isInstantMatch && (b.isAccepted || b.isInProgress)).toList();

  List<BookingModel> get pastInstantJobs =>
      _bookings.where((b) => b.isInstantMatch && (b.isCompleted || b.isDisputed || b.isDeclined || b.isExpired)).toList();

  // -----------------------------------------------------------
  // Scheduled Service Bookings Domain (Calendar Appointments)
  // -----------------------------------------------------------
  List<BookingModel> get scheduledBookings =>
      _bookings.where((b) => b.isScheduled).toList();

  List<BookingModel> get upcomingScheduledBookings {
    final list = _bookings
        .where((b) => b.isScheduled && (b.isAccepted || b.isInProgress))
        .toList();
    list.sort((a, b) {
      if (a.scheduledAt == null && b.scheduledAt == null) return 0;
      if (a.scheduledAt == null) return 1;
      if (b.scheduledAt == null) return -1;
      return a.scheduledAt!.compareTo(b.scheduledAt!);
    });
    return list;
  }

  List<BookingModel> get pastScheduledBookings {
    final list = _bookings
        .where((b) => b.isScheduled && (b.isCompleted || b.isDisputed || b.isDeclined || b.isExpired))
        .toList();
    list.sort((a, b) => (b.scheduledAt ?? b.createdAt).compareTo(a.scheduledAt ?? a.createdAt));
    return list;
  }

  // -----------------------------------------------------------
  // Convenience Metrics & Counter Getters
  // -----------------------------------------------------------
  int get activeInstantCount => activeInstantJobs.length;
  int get pendingScheduledCount => pendingRequests.length;
  int get upcomingScheduledCount => upcomingScheduledBookings.length;

  Future<void> fetchCustomerBookings() async {
    _isLoading = true;
    notifyListeners();

    try {
      _bookings = await repository.getCustomerBookings();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchProviderBookings() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        repository.getProviderBookings(),
        repository.getProviderBookingRequests().catchError((e) {
          debugPrint('getProviderBookingRequests failed or not supported: $e');
          return <BookingModel>[];
        }),
      ]);
      final fetchedBookings = results[0];
      final fetchedRequests = results[1];

      // Merge and deduplicate requests from both endpoints
      final Map<String, BookingModel> requestsMap = {};
      for (final r in fetchedRequests) {
        if (r.isScheduled && r.isRequested) {
          requestsMap[r.id] = r;
        }
      }
      for (final b in fetchedBookings) {
        if (b.isScheduled && b.isRequested) {
          requestsMap[b.id] = b;
        }
      }

      final mergedRequests = requestsMap.values.toList()
        ..sort((a, b) => (a.scheduledAt ?? a.createdAt).compareTo(b.scheduledAt ?? b.createdAt));

      // Ensure every pending request is also tracked in _bookings
      final Map<String, BookingModel> allBookingsMap = {};
      for (final b in fetchedBookings) {
        allBookingsMap[b.id] = b;
      }
      for (final r in mergedRequests) {
        allBookingsMap[r.id] = r;
      }

      _bookings = allBookingsMap.values.toList();
      _pendingRequests = mergedRequests;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> acceptBooking(String bookingId) async {
    _errorMessage = null;
    try {
      final updated = await repository.confirmBooking(bookingId);
      final idx = _bookings.indexWhere((b) => b.id == bookingId);
      if (idx != -1) {
        _bookings[idx] = updated;
      } else {
        _bookings.insert(0, updated);
      }
      _pendingRequests.removeWhere((b) => b.id == bookingId);
      if (_selectedBooking?.id == bookingId) {
        _selectedBooking = updated;
      }
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> declineBooking(String bookingId, {String? reason}) async {
    try {
      final updated = await repository.declineBooking(bookingId, reason: reason);
      _pendingRequests.removeWhere((b) => b.id == bookingId);
      final idx = _bookings.indexWhere((b) => b.id == bookingId);
      if (idx != -1) {
        _bookings[idx] = updated;
      } else {
        _bookings.insert(0, updated);
      }
      if (_selectedBooking?.id == bookingId) {
        _selectedBooking = updated;
      }
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> selectBooking(String bookingId) async {
    final existing = _bookings.cast<BookingModel?>().firstWhere(
      (b) => b?.id == bookingId,
      orElse: () => null,
    );
    if (existing != null) {
      _selectedBooking = existing;
      notifyListeners();
    }

    try {
      final fresh = await repository.getBookingById(bookingId);
      if (fresh != null) {
        final idx = _bookings.indexWhere((b) => b.id == bookingId);
        if (idx != -1) {
          _bookings[idx] = fresh;
        } else {
          _bookings.add(fresh);
        }
        _selectedBooking = fresh;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> updateSchedule(String bookingId, DateTime scheduledAt) async {
    try {
      final updated = await repository.updateBookingSchedule(bookingId, scheduledAt);
      final idx = _bookings.indexWhere((b) => b.id == bookingId);
      if (idx != -1) {
        _bookings[idx] = updated;
      }
      if (_selectedBooking?.id == bookingId) {
        _selectedBooking = updated;
      }
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateStatus(String bookingId, String newStatus) async {
    try {
      final updated = await repository.updateBookingStatus(bookingId, newStatus);
      final idx = _bookings.indexWhere((b) => b.id == bookingId);
      if (idx != -1) {
        _bookings[idx] = updated;
      } else {
        _bookings.insert(0, updated);
      }
      if (_selectedBooking?.id == bookingId) {
        _selectedBooking = updated;
      }
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<BookingModel?> createBookingFromListing({
    required String serviceListingId,
    required DateTime scheduledAt,
    String? serviceLocation,
    double? latitude,
    double? longitude,
    String? notes,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final booking = await repository.createBookingFromListing(
        serviceListingId: serviceListingId,
        scheduledAt: scheduledAt,
        serviceLocation: serviceLocation,
        latitude: latitude,
        longitude: longitude,
        notes: notes,
      );
      _bookings.insert(0, booking);
      if (booking.isScheduled && booking.isRequested) {
        _pendingRequests.removeWhere((b) => b.id == booking.id);
        _pendingRequests.insert(0, booking);
      }
      _isLoading = false;
      notifyListeners();
      return booking;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
      rethrow;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }
}
