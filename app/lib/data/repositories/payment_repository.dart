import 'package:flutter/foundation.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/payment_model.dart';
import '../models/payout_model.dart';

class PaymentRepository {
  final ApiClient apiClient;

  PaymentRepository({
    required this.apiClient,
  });

  /// Processes sandbox payment against ASP.NET Core backend.
  /// Backend executes payment via Polly retry policy against Stripe/PayHere sandbox.
  Future<PaymentModel> processPayment({
    required String invoiceId,
    String paymentMethod = 'card',
    String cardToken = 'tok_visa_sandbox',
    String cardLast4 = '4242',
    String gatewayProvider = 'Stripe',
  }) async {
    final response = await apiClient.post(
      ApiEndpoints.payments,
      body: {
        'invoiceId': invoiceId,
        'paymentMethod': paymentMethod,
        'paymentMethodType': paymentMethod,
        'cardToken': cardToken,
        'paymentToken': cardToken,
        'cardLast4': cardLast4,
        'last4': cardLast4,
        'gatewayProvider': gatewayProvider,
      },
    );

    if (response is Map<String, dynamic>) {
      return PaymentModel.fromJson(response);
    }

    throw ApiException(statusCode: 500, message: 'Failed to process payment');
  }

  /// Fetches payment record for a given invoice.
  Future<PaymentModel?> getPaymentByInvoiceId(String invoiceId) async {
    try {
      final response = await apiClient.get(ApiEndpoints.paymentByInvoiceId(invoiceId));
      if (response is Map<String, dynamic>) {
        return PaymentModel.fromJson(response);
      }
      return null;
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Fetches payment history for the authenticated customer.
  Future<List<PaymentModel>> getMyPayments() async {
    final response = await apiClient.get(ApiEndpoints.myPayments);
    if (response is List) {
      return response
          .map((e) => PaymentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Fetches earnings summary for the authenticated provider.
  Future<ProviderEarningsSummaryModel?> getProviderEarningsSummary() async {
    try {
      final response = await apiClient.get(ApiEndpoints.providerPayoutSummary);
      if (response is Map<String, dynamic>) {
        return ProviderEarningsSummaryModel.fromJson(response);
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching provider earnings summary: $e');
      return null;
    }
  }

  /// Fetches payout disbursement history for the authenticated provider.
  Future<List<PayoutModel>> getProviderPayoutHistory() async {
    try {
      final response = await apiClient.get(ApiEndpoints.providerPayouts);
      if (response is List) {
        return response
            .map((e) => PayoutModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching provider payout history: $e');
      return [];
    }
  }
}
