class AgentStepLogModel {
  final String id;
  final int stepNumber;
  final String agentName;
  final String action;
  final String? inputData;
  final String? outputData;
  final int durationMs;
  final DateTime timestamp;

  AgentStepLogModel({
    required this.id,
    required this.stepNumber,
    required this.agentName,
    required this.action,
    this.inputData,
    this.outputData,
    required this.durationMs,
    required this.timestamp,
  });

  factory AgentStepLogModel.fromJson(Map<String, dynamic> json) {
    return AgentStepLogModel(
      id: json['id']?.toString() ?? '',
      stepNumber: json['stepNumber'] is int ? json['stepNumber'] as int : int.tryParse(json['stepNumber']?.toString() ?? '0') ?? 0,
      agentName: json['agentName']?.toString() ?? '',
      action: json['action']?.toString() ?? '',
      inputData: json['inputData']?.toString(),
      outputData: json['outputData']?.toString(),
      durationMs: json['durationMs'] is int ? json['durationMs'] as int : int.tryParse(json['durationMs']?.toString() ?? '0') ?? 0,
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class AgentWorkflowModel {
  final String id;
  final String jobRequestId;
  final String workflowId;
  final String objective;
  final List<String> plan;
  final String validationTier;
  final String approvalStatus;
  final double? estimatedPrice;
  final String? selectedProviderId;
  final String? selectedProviderName;
  final String? finalResultJson;
  final String? decisionNote;
  final DateTime? decidedAt;
  final DateTime createdAt;
  final List<AgentStepLogModel> stepLogs;

  AgentWorkflowModel({
    required this.id,
    required this.jobRequestId,
    required this.workflowId,
    required this.objective,
    required this.plan,
    required this.validationTier,
    required this.approvalStatus,
    this.estimatedPrice,
    this.selectedProviderId,
    this.selectedProviderName,
    this.finalResultJson,
    this.decisionNote,
    this.decidedAt,
    required this.createdAt,
    required this.stepLogs,
  });

  bool get isApproved => approvalStatus.toLowerCase() == 'approved';
  bool get isPending => approvalStatus.toLowerCase() == 'pending';
  bool get isRequiresHumanApproval =>
      validationTier.toLowerCase() == 'requires_human_approval' ||
      validationTier.toLowerCase() == 'requireshumanapproval';
  bool get isAutoApproved =>
      validationTier.toLowerCase() == 'approved_for_auto_dispatch' ||
      validationTier.toLowerCase() == 'approvedforautodispatch';
  bool get isApprovedWithAudit =>
      validationTier.toLowerCase() == 'approved_with_audit' ||
      validationTier.toLowerCase() == 'approvedwithaudit';

  factory AgentWorkflowModel.fromJson(Map<String, dynamic> json) {
    var rawPlan = json['plan'];
    List<String> parsedPlan = [];
    if (rawPlan is List) {
      parsedPlan = rawPlan.map((e) => e.toString()).toList();
    }

    var rawLogs = json['stepLogs'];
    List<AgentStepLogModel> parsedLogs = [];
    if (rawLogs is List) {
      parsedLogs = rawLogs
          .whereType<Map<String, dynamic>>()
          .map((e) => AgentStepLogModel.fromJson(e))
          .toList();
    }

    double? parsedPrice;
    if (json['estimatedPrice'] != null) {
      parsedPrice = double.tryParse(json['estimatedPrice'].toString());
    }

    return AgentWorkflowModel(
      id: json['id']?.toString() ?? '',
      jobRequestId: json['jobRequestId']?.toString() ?? '',
      workflowId: json['workflowId']?.toString() ?? '',
      objective: json['objective']?.toString() ?? '',
      plan: parsedPlan,
      validationTier: json['validationTier']?.toString() ?? 'requires_human_approval',
      approvalStatus: json['approvalStatus']?.toString() ?? 'pending',
      estimatedPrice: parsedPrice,
      selectedProviderId: json['selectedProviderId']?.toString(),
      selectedProviderName: json['selectedProviderName']?.toString(),
      finalResultJson: json['finalResultJson']?.toString(),
      decisionNote: json['decisionNote']?.toString(),
      decidedAt: json['decidedAt'] != null ? DateTime.tryParse(json['decidedAt'].toString()) : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      stepLogs: parsedLogs,
    );
  }
}
