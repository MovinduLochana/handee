import 'package:flutter/material.dart';
import '../data/models/booking_model.dart';
import '../data/repositories/booking_repository.dart';

class BookingProvider extends ChangeNotifier {
  final BookingRepository repository;

  List<BookingModel> _bookings = [];
  BookingModel? _selectedBooking;
  bool _isLoading = false;
  String? _errorMessage;

  BookingProvider({required this.repository});

  List<BookingModel> get bookings => _bookings;
  BookingModel? get selectedBooking => _selectedBooking;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<BookingModel> get activeBookings =>
      _bookings.where((b) => b.isRequested || b.isAccepted || b.isInProgress).toList();

  List<BookingModel> get completedBookings =>
      _bookings.where((b) => b.isCompleted).toList();

  List<BookingModel> get disputedBookings =>
      _bookings.where((b) => b.isDisputed).toList();

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
    notifyListeners();

    try {
      _bookings = await repository.getProviderBookings();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectBooking(String bookingId) async {
    _selectedBooking = _bookings.firstWhere(
      (b) => b.id == bookingId,
      orElse: () => _bookings.first,
    );
    notifyListeners();

    try {
      final fresh = await repository.getBookingById(bookingId);
      if (fresh != null) {
        _selectedBooking = fresh;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> updateStatus(String bookingId, String newStatus) async {
    try {
      final updated = await repository.updateBookingStatus(bookingId, newStatus);
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
}
