class PayoutModel {
  final String id;
  final String providerId;
  final String? providerName;
  final String bookingId;
  final double grossAmount;
  final double platformFeeDeducted;
  final double netAmount;
  final String currency;
  final String status;
  final String? payoutBatchId;
  final DateTime? disbursedAt;
  final DateTime createdAt;

  PayoutModel({
    required this.id,
    required this.providerId,
    this.providerName,
    required this.bookingId,
    required this.grossAmount,
    required this.platformFeeDeducted,
    required this.netAmount,
    this.currency = 'LKR',
    required this.status,
    this.payoutBatchId,
    this.disbursedAt,
    required this.createdAt,
  });

  factory PayoutModel.fromJson(Map<String, dynamic> json) {
    return PayoutModel(
      id: json['id']?.toString() ?? '',
      providerId: json['providerId']?.toString() ?? '',
      providerName: json['providerName']?.toString(),
      bookingId: json['bookingId']?.toString() ?? '',
      grossAmount: (json['grossAmount'] as num?)?.toDouble() ?? 0.0,
      platformFeeDeducted: (json['platformFeeDeducted'] as num?)?.toDouble() ?? 0.0,
      netAmount: (json['netAmount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency']?.toString() ?? 'LKR',
      status: json['status']?.toString() ?? 'Pending',
      payoutBatchId: json['payoutBatchId']?.toString(),
      disbursedAt: json['disbursedAt'] != null ? DateTime.tryParse(json['disbursedAt'].toString()) : null,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'providerId': providerId,
      'providerName': providerName,
      'bookingId': bookingId,
      'grossAmount': grossAmount,
      'platformFeeDeducted': platformFeeDeducted,
      'netAmount': netAmount,
      'currency': currency,
      'status': status,
      'payoutBatchId': payoutBatchId,
      'disbursedAt': disbursedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class ProviderEarningsSummaryModel {
  final String providerId;
  final double totalEarnings;
  final double availableBalance;
  final double pendingPayouts;
  final int completedJobsCount;
  final List<PayoutModel> recentPayouts;

  ProviderEarningsSummaryModel({
    required this.providerId,
    required this.totalEarnings,
    required this.availableBalance,
    required this.pendingPayouts,
    required this.completedJobsCount,
    this.recentPayouts = const [],
  });

  factory ProviderEarningsSummaryModel.fromJson(Map<String, dynamic> json) {
    final recentList = (json['recentPayouts'] as List<dynamic>?)
            ?.map((e) => PayoutModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    return ProviderEarningsSummaryModel(
      providerId: json['providerId']?.toString() ?? '',
      totalEarnings: (json['totalEarnings'] as num?)?.toDouble() ?? 0.0,
      availableBalance: (json['availableBalance'] as num?)?.toDouble() ?? 0.0,
      pendingPayouts: (json['pendingPayouts'] as num?)?.toDouble() ?? 0.0,
      completedJobsCount: (json['completedJobsCount'] as num?)?.toInt() ?? 0,
      recentPayouts: recentList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'providerId': providerId,
      'totalEarnings': totalEarnings,
      'availableBalance': availableBalance,
      'pendingPayouts': pendingPayouts,
      'completedJobsCount': completedJobsCount,
      'recentPayouts': recentPayouts.map((e) => e.toJson()).toList(),
    };
  }
}
