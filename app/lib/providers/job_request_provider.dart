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
  Future<JobRequestModel?> submitInstantMatch({
    required String serviceCategoryId,
    required String description,
    required String location,
    required String urgency,
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
      final created = await repository.createJobRequest(
        serviceCategoryId: serviceCategoryId,
        description: description,
        location: location,
        urgency: urgency,
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

  /// Re-fetches the tracked request from the server.
  ///
  /// Replaces a previous client-side `Timer` simulation that fabricated
  /// status progression locally. Status is owned by the backend (the agent
  /// workflow moves PendingAiReview -> Open), so the only honest way to
  /// observe progress is to ask the server.
  Future<void> refreshTrackedRequest() async {
    final tracked = _currentTrackedRequest;
    if (tracked == null) return;

    try {
      final fresh = await repository.getJobRequestById(tracked.id);
      if (fresh == null) return;

      _currentTrackedRequest = fresh;
      final idx = _requests.indexWhere((r) => r.id == fresh.id);
      if (idx != -1) {
        _requests[idx] = fresh;
      }
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }
}
