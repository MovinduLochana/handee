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
  final String? invoiceId;
  final DateTime? disbursedAt;
  final DateTime createdAt;

  PayoutModel({
    required this.id,
    required this.providerId,
    this.providerName,
    required this.bookingId,
    this.invoiceId,
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
      invoiceId: json['invoiceId']?.toString(),
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
      'invoiceId': invoiceId,
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
  final ProviderBankAccountModel? bankAccount;

  ProviderEarningsSummaryModel({
    required this.providerId,
    required this.totalEarnings,
    required this.availableBalance,
    required this.pendingPayouts,
    required this.completedJobsCount,
    this.recentPayouts = const [],
    this.bankAccount,
  });

  factory ProviderEarningsSummaryModel.fromJson(Map<String, dynamic> json) {
    final recentList = (json['recentPayouts'] as List<dynamic>?)
            ?.map((e) => PayoutModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    final bankJson = json['bankAccount'] as Map<String, dynamic>?;

    return ProviderEarningsSummaryModel(
      providerId: json['providerId']?.toString() ?? '',
      totalEarnings: (json['totalEarnings'] as num?)?.toDouble() ?? 0.0,
      availableBalance: (json['availableBalance'] as num?)?.toDouble() ?? 0.0,
      pendingPayouts: (json['pendingPayouts'] as num?)?.toDouble() ?? 0.0,
      completedJobsCount: (json['completedJobsCount'] as num?)?.toInt() ?? 0,
      recentPayouts: recentList,
      bankAccount: bankJson != null ? ProviderBankAccountModel.fromJson(bankJson) : null,
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
      if (bankAccount != null) 'bankAccount': bankAccount!.toJson(),
    };
  }
}

class ProviderBankAccountModel {
  final String bankName;
  final String branchName;
  final String? branchCode;
  final String accountNumber;
  final String accountHolderName;
  final DateTime? updatedAt;

  ProviderBankAccountModel({
    required this.bankName,
    required this.branchName,
    this.branchCode,
    required this.accountNumber,
    required this.accountHolderName,
    this.updatedAt,
  });

  factory ProviderBankAccountModel.fromJson(Map<String, dynamic> json) {
    return ProviderBankAccountModel(
      bankName: json['bankName']?.toString() ?? '',
      branchName: json['branchName']?.toString() ?? '',
      branchCode: json['branchCode']?.toString(),
      accountNumber: json['accountNumber']?.toString() ?? '',
      accountHolderName: json['accountHolderName']?.toString() ?? '',
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'bankName': bankName,
      'branchName': branchName,
      'branchCode': branchCode,
      'accountNumber': accountNumber,
      'accountHolderName': accountHolderName,
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }
}

class WithdrawalResponseModel {
  final String batchReference;
  final double amountRequested;
  final int payoutsCount;
  final String status;
  final DateTime requestedAt;

  WithdrawalResponseModel({
    required this.batchReference,
    required this.amountRequested,
    required this.payoutsCount,
    required this.status,
    required this.requestedAt,
  });

  factory WithdrawalResponseModel.fromJson(Map<String, dynamic> json) {
    return WithdrawalResponseModel(
      batchReference: json['batchReference']?.toString() ?? '',
      amountRequested: (json['amountRequested'] as num?)?.toDouble() ?? 0.0,
      payoutsCount: (json['payoutsCount'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? 'Processing',
      requestedAt: json['requestedAt'] != null
          ? DateTime.tryParse(json['requestedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'batchReference': batchReference,
      'amountRequested': amountRequested,
      'payoutsCount': payoutsCount,
      'status': status,
      'requestedAt': requestedAt.toIso8601String(),
    };
  }
}
