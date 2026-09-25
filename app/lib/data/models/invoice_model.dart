import 'dart:convert';

class InvoiceLineItem {
  final String item;
  final double price;
  final String? type;

  InvoiceLineItem({
    required this.item,
    required this.price,
    this.type,
  });

  factory InvoiceLineItem.fromJson(Map<String, dynamic> json) {
    return InvoiceLineItem(
      item: json['item']?.toString() ?? 'Service Item',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      type: json['type']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'item': item,
      'price': price,
      if (type != null) 'type': type,
    };
  }
}

class InvoiceModel {
  final String id;
  final String bookingId;
  final String customerId;
  final String? customerName;
  final String providerId;
  final String? providerName;
  final double baseAmount;
  final double platformFee;
  final double totalAmount;
  final String currency;
  final String status; // "Issued", "Paid", "Overdue", "Cancelled"
  final String adminApprovalStatus; // "AutoApproved", "Approved", "PendingReview"
  final String? lineItemsJson;
  final DateTime? dueAt;
  final DateTime? paidAt;
  final DateTime createdAt;

  InvoiceModel({
    required this.id,
    required this.bookingId,
    required this.customerId,
    this.customerName,
    required this.providerId,
    this.providerName,
    required this.baseAmount,
    required this.platformFee,
    required this.totalAmount,
    this.currency = 'LKR',
    required this.status,
    this.adminApprovalStatus = 'AutoApproved',
    this.lineItemsJson,
    this.dueAt,
    this.paidAt,
    required this.createdAt,
  });

  bool get isPaid => status.toLowerCase() == 'paid';
  bool get isIssued => status.toLowerCase() == 'issued';
  bool get isOverdue => status.toLowerCase() == 'overdue';

  String get displayStatus {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'Paid';
      case 'issued':
        return 'Ready to Pay';
      case 'overdue':
        return 'Payment Overdue';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  /// Calculates labor portion as percentage of total (should be ~85%)
  double get laborPercentage => totalAmount > 0 ? (baseAmount / totalAmount) * 100 : 85.0;

  /// Calculates platform fee portion as percentage of total (should be ~15%)
  double get feePercentage => totalAmount > 0 ? (platformFee / totalAmount) * 100 : 15.0;

  List<InvoiceLineItem> get lineItems {
    if (lineItemsJson == null || lineItemsJson!.trim().isEmpty) {
      return [
        InvoiceLineItem(item: 'Service Labor (85%)', price: baseAmount, type: 'Labor'),
        InvoiceLineItem(item: 'Platform Trust & Safety Fee (15%)', price: platformFee, type: 'Fee'),
      ];
    }
    try {
      final decoded = jsonDecode(lineItemsJson!);
      if (decoded is List) {
        return decoded
            .map((item) => InvoiceLineItem.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return [
      InvoiceLineItem(item: 'Service Labor (85%)', price: baseAmount, type: 'Labor'),
      InvoiceLineItem(item: 'Platform Trust & Safety Fee (15%)', price: platformFee, type: 'Fee'),
    ];
  }

  factory InvoiceModel.fromJson(Map<String, dynamic> json) {
    return InvoiceModel(
      id: json['id']?.toString() ?? '',
      bookingId: json['bookingId']?.toString() ?? '',
      customerId: json['customerId']?.toString() ?? '',
      customerName: json['customerName']?.toString(),
      providerId: json['providerId']?.toString() ?? '',
      providerName: json['providerName']?.toString(),
      baseAmount: (json['baseAmount'] as num?)?.toDouble() ?? 0.0,
      platformFee: (json['platformFee'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency']?.toString() ?? 'LKR',
      status: json['status']?.toString() ?? 'Issued',
      adminApprovalStatus: json['adminApprovalStatus']?.toString() ?? 'AutoApproved',
      lineItemsJson: json['lineItemsJson']?.toString() ?? json['lineItems']?.toString(),
      dueAt: json['dueAt'] != null ? DateTime.tryParse(json['dueAt'].toString()) : null,
      paidAt: json['paidAt'] != null ? DateTime.tryParse(json['paidAt'].toString()) : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'bookingId': bookingId,
      'customerId': customerId,
      'customerName': customerName,
      'providerId': providerId,
      'providerName': providerName,
      'baseAmount': baseAmount,
      'platformFee': platformFee,
      'totalAmount': totalAmount,
      'currency': currency,
      'status': status,
      'adminApprovalStatus': adminApprovalStatus,
      'lineItemsJson': lineItemsJson,
      'dueAt': dueAt?.toIso8601String(),
      'paidAt': paidAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
