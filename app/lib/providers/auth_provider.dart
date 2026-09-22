import 'package:flutter/material.dart';
import '../core/services/storage_service.dart';
import '../data/models/user_model.dart';
import '../data/repositories/auth_repository.dart';

class AuthProvider extends ChangeNotifier {
  final AuthRepository authRepo;
  final StorageService storage;

  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  AuthProvider({
    required this.authRepo,
    required this.storage,
  }) {
    _loadUser();
  }

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;
  bool get isCustomer => _currentUser?.isCustomer ?? true;
  bool get isProvider => _currentUser?.isProvider ?? false;
  bool get useMockApi => storage.getUseMock();

  Future<void> _loadUser() async {
    _currentUser = await authRepo.getCurrentUser();
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentUser = await authRepo.login(email: email, password: password);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('ApiException', '').replaceAll('[', '').replaceAll(']', '').trim();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String fullName,
    required String email,
    required String password,
    required String role,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentUser = await authRepo.register(
        fullName: fullName,
        email: email,
        password: password,
        role: role,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('ApiException', '').trim();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Fast demo role switch between Customer and Provider.
  Future<void> switchRole(String newRole) async {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(role: newRole);
    await storage.setUserRole(newRole);
    notifyListeners();
  }

  Future<void> setUseMock(bool value) async {
    await storage.setUseMock(value);
    notifyListeners();
  }

  Future<void> logout() async {
    await authRepo.logout();
    _currentUser = null;
    notifyListeners();
  }
}
