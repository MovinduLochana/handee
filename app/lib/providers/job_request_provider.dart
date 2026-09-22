import 'dart:async';
import 'package:flutter/material.dart';
import '../data/models/job_request_model.dart';
import '../data/repositories/job_request_repository.dart';

class JobRequestProvider extends ChangeNotifier {
  final JobRequestRepository repository;

  List<JobRequestModel> _requests = [];
  JobRequestModel? _currentTrackedRequest;
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _errorMessage;

  JobRequestProvider({required this.repository});

  List<JobRequestModel> get requests => _requests;
  JobRequestModel? get currentTrackedRequest => _currentTrackedRequest;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get errorMessage => _errorMessage;

  Future<void> fetchMyRequests() async {
    _isLoading = true;
    notifyListeners();

    try {
      _requests = await repository.getMyJobRequests();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<JobRequestModel?> submitInstantMatch({
    required String category,
    required String description,
    required String location,
    required String urgency,
    double? budgetMin,
    double? budgetMax,
    List<String> photoUrls = const [],
  }) async {
    _isSubmitting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final created = await repository.createJobRequest(
        category: category,
        description: description,
        location: location,
        urgency: urgency,
        budgetMin: budgetMin,
        budgetMax: budgetMax,
        photoUrls: photoUrls,
      );

      _requests.insert(0, created);
      _currentTrackedRequest = created;
      _isSubmitting = false;
      notifyListeners();

      // Trigger automatic simulation of AI Agent workflow progression
      _simulateAiAgentProgression(created.id);

      return created;
    } catch (e) {
      _errorMessage = e.toString();
      _isSubmitting = false;
      notifyListeners();
      return null;
    }
  }

  void setCurrentTrackedRequest(JobRequestModel request) {
    _currentTrackedRequest = request;
    notifyListeners();
  }

  /// Simulates the 4-agent workflow progression in the background:
  /// pending_ai_review -> approved_for_auto_dispatch -> provider assigned
  void _simulateAiAgentProgression(String requestId) {
    Timer(const Duration(seconds: 4), () {
      if (_currentTrackedRequest != null && _currentTrackedRequest!.id == requestId) {
        _currentTrackedRequest = _currentTrackedRequest!.copyWith(
          status: 'approved_for_auto_dispatch',
          estimatedPrice: _currentTrackedRequest!.estimatedPrice ?? 4800,
        );

        final idx = _requests.indexWhere((r) => r.id == requestId);
        if (idx != -1) {
          _requests[idx] = _currentTrackedRequest!;
        }
        notifyListeners();
      }
    });

    Timer(const Duration(seconds: 9), () {
      if (_currentTrackedRequest != null && _currentTrackedRequest!.id == requestId) {
        _currentTrackedRequest = _currentTrackedRequest!.copyWith(
          status: 'dispatched',
        );

        final idx = _requests.indexWhere((r) => r.id == requestId);
        if (idx != -1) {
          _requests[idx] = _currentTrackedRequest!;
        }
        notifyListeners();
      }
    });
  }
}
