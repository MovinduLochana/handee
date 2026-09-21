import 'package:shared_preferences/shared_preferences.dart';

/// Manages local persistence for auth tokens, active role, and session state.
class StorageService {
  static StorageService? _instance;
  static SharedPreferences? _prefs;

  StorageService._();

  static Future<StorageService> getInstance() async {
    _instance ??= StorageService._();
    _prefs ??= await SharedPreferences.getInstance();
    return _instance!;
  }

  static const String _keyToken = 'auth_access_token';
  static const String _keyRefreshToken = 'auth_refresh_token';
  static const String _keyUserId = 'user_id';
  static const String _keyUserEmail = 'user_email';
  static const String _keyUserName = 'user_name';
  static const String _keyUserRole = 'user_role'; // "Customer" or "Provider"
  static const String _keyUseMock = 'use_mock_api';

  // Tokens
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _prefs?.setString(_keyToken, accessToken);
    await _prefs?.setString(_keyRefreshToken, refreshToken);
  }

  String? getAccessToken() => _prefs?.getString(_keyToken);
  String? getRefreshToken() => _prefs?.getString(_keyRefreshToken);

  // User Profile
  Future<void> saveUser({
    required String id,
    required String email,
    required String fullName,
    required String role,
  }) async {
    await _prefs?.setString(_keyUserId, id);
    await _prefs?.setString(_keyUserEmail, email);
    await _prefs?.setString(_keyUserName, fullName);
    await _prefs?.setString(_keyUserRole, role);
  }

  String? getUserId() => _prefs?.getString(_keyUserId);
  String? getUserEmail() => _prefs?.getString(_keyUserEmail);
  String? getUserName() => _prefs?.getString(_keyUserName);
  String getUserRole() => _prefs?.getString(_keyUserRole) ?? 'Customer';

  Future<void> setUserRole(String role) async {
    await _prefs?.setString(_keyUserRole, role);
  }

  // Mock API toggle (disabled - real backend is primary)
  bool getUseMock() => _prefs?.getBool(_keyUseMock) ?? false;
  Future<void> setUseMock(bool value) async {
    await _prefs?.setBool(_keyUseMock, value);
  }

  // Clear Session
  Future<void> clearSession() async {
    await _prefs?.remove(_keyToken);
    await _prefs?.remove(_keyRefreshToken);
    await _prefs?.remove(_keyUserId);
    await _prefs?.remove(_keyUserEmail);
    await _prefs?.remove(_keyUserName);
  }

  bool get isLoggedIn => getAccessToken() != null && getAccessToken()!.isNotEmpty;
}
