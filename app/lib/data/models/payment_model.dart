class PaymentModel {
  final String id;
  final String invoiceId;
  final String bookingId;
  final double amount;
  final String currency;
  final String gatewayProvider;
  final String transactionReference;
  final String status; // "Succeeded", "Pending", "Failed"
  final String? cardLast4;
  final String? failureReason;
  final DateTime createdAt;
  final DateTime? settledAt;

  PaymentModel({
    required this.id,
    required this.invoiceId,
    required this.bookingId,
    required this.amount,
    this.currency = 'LKR',
    this.gatewayProvider = 'Stripe',
    required this.transactionReference,
    required this.status,
    this.cardLast4 = '4242',
    this.failureReason,
    required this.createdAt,
    this.settledAt,
  });

  bool get isSucceeded => status.toLowerCase() == 'succeeded';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isFailed => status.toLowerCase() == 'failed';

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id']?.toString() ?? '',
      invoiceId: json['invoiceId']?.toString() ?? '',
      bookingId: json['bookingId']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency']?.toString() ?? 'LKR',
      gatewayProvider: json['gatewayProvider']?.toString() ?? 'Stripe',
      transactionReference: json['transactionReference']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Succeeded',
      cardLast4: json['cardLast4']?.toString() ?? '4242',
      failureReason: json['failureReason']?.toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      settledAt: json['settledAt'] != null
          ? DateTime.tryParse(json['settledAt'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'invoiceId': invoiceId,
      'bookingId': bookingId,
      'amount': amount,
      'currency': currency,
      'gatewayProvider': gatewayProvider,
      'transactionReference': transactionReference,
      'status': status,
      'cardLast4': cardLast4,
      'failureReason': failureReason,
      'createdAt': createdAt.toIso8601String(),
      'settledAt': settledAt?.toIso8601String(),
    };
  }
}
