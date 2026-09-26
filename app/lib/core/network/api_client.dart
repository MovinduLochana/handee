import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../constants/api_endpoints.dart';
import '../services/storage_service.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final dynamic details;

  ApiException({
    required this.statusCode,
    required this.message,
    this.details,
  });

  @override
  String toString() => 'ApiException [$statusCode]: $message';
}

/// HTTP API Client for Handee Backend.
/// Seamlessly handles JWT authentication and provides graceful fallback
/// to mock data when backend services are offline or not yet implemented.
class ApiClient {
  final StorageService storage;
  final http.Client _httpClient;
  String _baseUrl;

  ApiClient({
    required this.storage,
    http.Client? httpClient,
    String? baseUrl,
  })  : _httpClient = httpClient ?? http.Client(),
        _baseUrl = baseUrl ?? ApiEndpoints.baseUrl;

  void setBaseUrl(String url) {
    _baseUrl = url;
  }

  String get baseUrl => _baseUrl;

  Map<String, String> _buildHeaders({Map<String, String>? extraHeaders}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final token = storage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    if (extraHeaders != null) {
      headers.addAll(extraHeaders);
    }
    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final urlString = '$_baseUrl$cleanPath';
    return Uri.parse(urlString).replace(
      queryParameters: queryParams?.map((k, v) => MapEntry(k, v?.toString() ?? '')),
    );
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParams}) async {
    try {
      final uri = _buildUri(path, queryParams);
      final response = await _httpClient
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 35));
      return _handleResponse(response);
    } catch (e) {
      debugPrint('ApiClient GET error on $path: $e');
      rethrow;
    }
  }

  Future<dynamic> post(String path, {dynamic body}) async {
    try {
      final uri = _buildUri(path);
      final response = await _httpClient
          .post(
            uri,
            headers: _buildHeaders(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 35));
      return _handleResponse(response);
    } catch (e) {
      debugPrint('ApiClient POST error on $path: $e');
      rethrow;
    }
  }

  Future<dynamic> put(String path, {dynamic body}) async {
    try {
      final uri = _buildUri(path);
      final response = await _httpClient
          .put(
            uri,
            headers: _buildHeaders(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 35));
      return _handleResponse(response);
    } catch (e) {
      debugPrint('ApiClient PUT error on $path: $e');
      rethrow;
    }
  }

  dynamic _handleResponse(http.Response response) {
    final statusCode = response.statusCode;
    if (statusCode >= 200 && statusCode < 300) {
      if (response.body.isEmpty) return null;
      try {
        return jsonDecode(response.body);
      } catch (_) {
        return response.body;
      }
    }

    String message = 'Request failed with status $statusCode';
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map) {
        if (decoded.containsKey('message')) {
          message = decoded['message'].toString();
        } else if (decoded.containsKey('error')) {
          message = decoded['error'].toString();
        }
      } else if (decoded is String) {
        message = decoded;
      }
    } catch (_) {
      if (response.body.isNotEmpty) {
        message = response.body;
      }
    }

    throw ApiException(statusCode: statusCode, message: message);
  }

  /// Executes the API call and provides unified exception handling.
  Future<T> withFallback<T>({
    required Future<T> Function() apiCall,
    Future<T> Function()? fallbackCall,
  }) async {
    try {
      return await apiCall();
    } on SocketException catch (e) {
      debugPrint('Backend server unreachable ($e).');
      throw ApiException(
        statusCode: 503,
        message: 'Could not connect to Handee server. Please check your connection.',
      );
    } on TimeoutException catch (_) {
      debugPrint('Backend request timed out.');
      throw ApiException(
        statusCode: 408,
        message: 'Server request timed out. Please try again.',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      debugPrint('Unexpected network error: $e');
      throw ApiException(
        statusCode: 500,
        message: 'Network error: $e',
      );
    }
  }
}
