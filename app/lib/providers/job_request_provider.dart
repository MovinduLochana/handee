import 'package:flutter/material.dart';
import '../data/models/agent_workflow_model.dart';
import '../data/models/job_request_model.dart';
import '../data/repositories/job_request_repository.dart';

class JobRequestProvider extends ChangeNotifier {
  final JobRequestRepository repository;

  List<JobRequestModel> _requests = [];
  JobRequestModel? _currentTrackedRequest;
  AgentWorkflowModel? _currentWorkflow;
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _errorMessage;

  JobRequestProvider({required this.repository});

  List<JobRequestModel> get requests => _requests;
  JobRequestModel? get currentTrackedRequest => _currentTrackedRequest;
  AgentWorkflowModel? get currentWorkflow => _currentWorkflow;
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
    required String serviceCategoryId,
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
        serviceCategoryId: serviceCategoryId,
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
    _currentWorkflow = null;
    notifyListeners();
    fetchWorkflowForTrackedRequest();
  }

  Future<void> fetchWorkflowForTrackedRequest() async {
    final tracked = _currentTrackedRequest;
    if (tracked == null) return;

    try {
      final wf = await repository.getJobWorkflow(tracked.id);
      if (wf != null) {
        _currentWorkflow = wf;
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Re-fetches the tracked request and its agent workflow from the server.
  Future<void> refreshTrackedRequest() async {
    final tracked = _currentTrackedRequest;
    if (tracked == null) return;

    try {
      final fresh = await repository.getJobRequestById(tracked.id);
      if (fresh != null) {
        _currentTrackedRequest = fresh;
        final idx = _requests.indexWhere((r) => r.id == fresh.id);
        if (idx != -1) {
          _requests[idx] = fresh;
        }
      }

      final wf = await repository.getJobWorkflow(tracked.id);
      if (wf != null) {
        _currentWorkflow = wf;
      }
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }
}
