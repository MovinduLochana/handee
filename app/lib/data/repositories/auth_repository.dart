import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/services/storage_service.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient apiClient;
  final StorageService storage;

  AuthRepository({
    required this.apiClient,
    required this.storage,
  });

  Future<UserModel> login({required String email, required String password}) async {
    final response = await apiClient.post(
      ApiEndpoints.login,
      body: {'email': email, 'password': password},
    );

    if (response is Map<String, dynamic>) {
      final accessToken = response['accessToken']?.toString() ?? '';
      final refreshToken = response['refreshToken']?.toString() ?? '';
      await storage.saveTokens(accessToken: accessToken, refreshToken: refreshToken);

      // Fetch user profile
      try {
        final profileJson = await apiClient.get(ApiEndpoints.userProfile);
        final user = UserModel.fromJson(profileJson as Map<String, dynamic>);
        await storage.saveUser(
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        );
        return user;
      } catch (_) {
        // Fallback to token payload or defaults if /users/me fails
        final user = UserModel(
          id: response['userId']?.toString() ?? 'user',
          email: email,
          fullName: response['fullName']?.toString() ?? email.split('@')[0],
          role: storage.getUserRole(),
        );
        return user;
      }
    }
    throw ApiException(statusCode: 400, message: 'Invalid response from server');
  }

  Future<UserModel> register({
    required String fullName,
    required String email,
    required String password,
    required String role, // "Customer" or "Provider"
    String? phoneNumber,
    String? address,
  }) async {
    final response = await apiClient.post(
      ApiEndpoints.register,
      body: {
        'fullName': fullName,
        'email': email,
        'password': password,
        'role': role,
      },
    );

    // Automatically log in after registration
    UserModel loggedInUser;
    try {
      loggedInUser = await login(email: email, password: password);
    } catch (_) {
      loggedInUser = UserModel(
        id: response is Map ? (response['id']?.toString() ?? '') : '',
        email: email,
        fullName: fullName,
        role: role,
        phoneNumber: phoneNumber,
        address: address,
      );
      await storage.saveUser(
        id: loggedInUser.id,
        email: loggedInUser.email,
        fullName: loggedInUser.fullName,
        role: loggedInUser.role,
      );
      return loggedInUser;
    }

    if (phoneNumber != null || address != null) {
      try {
        loggedInUser = await updateProfile(
          phoneNumber: phoneNumber,
          address: address,
        );
      } catch (_) {}
    }

    return loggedInUser;
  }

  Future<UserModel?> getCurrentUser() async {
    final userId = storage.getUserId();
    if (userId == null) return null;

    final email = storage.getUserEmail() ?? '';
    final name = storage.getUserName() ?? 'User';
    final role = storage.getUserRole();

    return UserModel(id: userId, email: email, fullName: name, role: role);
  }

  Future<UserModel> updateProfile({
    String? fullName,
    String? phoneNumber,
    String? address,
  }) async {
    final body = <String, dynamic>{};
    if (fullName != null) body['fullName'] = fullName;
    if (phoneNumber != null) body['phoneNumber'] = phoneNumber;

    try {
      await apiClient.put(ApiEndpoints.userProfile, body: body);
    } catch (_) {
      // Graceful offline/demo fallback
    }

    final userId = storage.getUserId() ?? 'user-1';
    final email = storage.getUserEmail() ?? '';
    final role = storage.getUserRole();
    final updatedName = fullName ?? storage.getUserName() ?? 'User';

    await storage.saveUser(
      id: userId,
      email: email,
      fullName: updatedName,
      role: role,
    );

    return UserModel(
      id: userId,
      email: email,
      fullName: updatedName,
      role: role,
      phoneNumber: phoneNumber,
      address: address,
    );
  }

  Future<void> logout() async {
    await storage.clearSession();
  }
}
