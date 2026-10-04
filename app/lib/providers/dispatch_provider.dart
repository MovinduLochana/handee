import 'dart:async';
import 'package:flutter/material.dart';
import '../data/models/booking_model.dart';
import '../data/models/provider_profile_model.dart';
import '../data/repositories/dispatch_repository.dart';

class DispatchProvider extends ChangeNotifier {
  final DispatchRepository repository;

  List<BookingModel> _incomingOffers = [];
  ProviderProfileModel? _providerProfile;
  bool _isOnline = true;
  bool _isLoading = false;
  int _countdownSeconds = 90;
  Timer? _countdownTimer;
  bool _isDisposed = false;

  DispatchProvider({required this.repository}) {
    _loadProfile();
    fetchOffers();
  }

  List<BookingModel> get incomingOffers => _incomingOffers;
  ProviderProfileModel? get providerProfile => _providerProfile;
  bool get isOnline => _isOnline;
  bool get isLoading => _isLoading;
  int get countdownSeconds => _countdownSeconds;
  bool get hasActiveIncomingOffer => _incomingOffers.isNotEmpty && _countdownSeconds > 0;

  Future<void> _loadProfile() async {
    _providerProfile = await repository.getProviderProfile();
    _isOnline = _providerProfile?.isOnline ?? true;
    notifyListeners();
  }

  void toggleOnline(bool value) {
    _isOnline = value;
    if (_providerProfile != null) {
      _providerProfile = _providerProfile!.copyWith(isOnline: value);
    }
    notifyListeners();
  }

  Future<void> fetchOffers() async {
    if (!_isOnline) return;
    _isLoading = true;
    notifyListeners();

    try {
      _incomingOffers = await repository.getIncomingOffers();
      _isLoading = false;
      notifyListeners();

      if (_incomingOffers.isNotEmpty) {
        _startCountdown();
      }
    } catch (_) {
      _isLoading = false;
      notifyListeners();
    }
  }

  void addIncomingOffer(BookingModel offer) {
    if (!_incomingOffers.any((o) => o.id == offer.id)) {
      _incomingOffers.add(offer);
      _startCountdown();
      notifyListeners();
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    final firstOffer = _incomingOffers.isNotEmpty ? _incomingOffers.first : null;
    final remaining = firstOffer?.remainingSeconds;
    _countdownSeconds = (remaining != null && remaining > 0) ? remaining : 90;

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdownSeconds > 0) {
        _countdownSeconds--;
        notifyListeners();
      } else {
        timer.cancel();
        if (_incomingOffers.isNotEmpty) {
          // Timeout: auto-decline
          declineOffer(_incomingOffers.first.id);
        }
      }
    });
  }

  Future<bool> acceptOffer(String offerId) async {
    _countdownTimer?.cancel();
    try {
      await repository.acceptOffer(offerId);
      _incomingOffers.removeWhere((o) => o.id == offerId);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> declineOffer(String offerId) async {
    _countdownTimer?.cancel();
    await repository.declineOffer(offerId);
    _incomingOffers.removeWhere((o) => o.id == offerId);
    notifyListeners();
  }

  @override
  void notifyListeners() {
    if (_isDisposed) return;
    super.notifyListeners();
  }

  @override
  void dispose() {
    _isDisposed = true;
    _countdownTimer?.cancel();
    super.dispose();
  }
}
