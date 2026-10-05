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

  /// Fetches PayHere checkout parameters and MD5 hash for an invoice.
  Future<Map<String, dynamic>?> getPayHereParams(String invoiceId) async {
    try {
      final response = await apiClient.get(ApiEndpoints.payHereParams(invoiceId));
      if (response is Map<String, dynamic>) {
        return response;
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching PayHere params: $e');
      return null;
    }
  }

  /// Confirms PayHere payment upon checkout completion.
  Future<PaymentModel?> confirmPayHerePayment({
    required String invoiceId,
    String? paymentId,
    String? orderId,
    double? amount,
    String? currency,
    String? cardLast4,
    String? method,
  }) async {
    final response = await apiClient.post(
      ApiEndpoints.payHereConfirm,
      body: {
        'invoiceId': invoiceId,
        'paymentId': paymentId,
        'orderId': orderId,
        'amount': amount,
        'currency': currency,
        'cardLast4': cardLast4 ?? '4242',
        'method': method ?? 'PAYHERE_SANDBOX',
      },
    );

    if (response is Map<String, dynamic>) {
      return PaymentModel.fromJson(response);
    }
    return null;
  }

  /// Resets an invoice to Unpaid/Issued for sandbox re-testing.
  Future<bool> resetInvoice(String invoiceId) async {
    try {
      await apiClient.post(ApiEndpoints.resetInvoice(invoiceId));
      return true;
    } catch (e) {
      debugPrint('Error resetting invoice: $e');
      return false;
    }
  }

  /// Fetches saved bank account details for the authenticated provider.
  Future<ProviderBankAccountModel?> getProviderBankAccount() async {
    try {
      final response = await apiClient.get(ApiEndpoints.providerBankAccount);
      if (response is Map<String, dynamic>) {
        return ProviderBankAccountModel.fromJson(response);
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching provider bank account: $e');
      return null;
    }
  }

  /// Saves or updates Sri Lankan bank account details for payouts.
  Future<ProviderBankAccountModel> saveProviderBankAccount({
    required String bankName,
    required String branchName,
    String? branchCode,
    required String accountNumber,
    required String accountHolderName,
  }) async {
    final response = await apiClient.post(
      ApiEndpoints.providerBankAccount,
      body: {
        'bankName': bankName,
        'branchName': branchName,
        'branchCode': branchCode,
        'accountNumber': accountNumber,
        'accountHolderName': accountHolderName,
      },
    );

    if (response is Map<String, dynamic>) {
      return ProviderBankAccountModel.fromJson(response);
    }

    throw ApiException(statusCode: 500, message: 'Failed to save bank account details');
  }

  /// Requests payout withdrawal to provider's linked bank account.
  Future<WithdrawalResponseModel> requestWithdrawal({double? amount}) async {
    final response = await apiClient.post(
      ApiEndpoints.requestWithdrawal,
      body: {
        if (amount != null) 'amount': amount,
      },
    );

    if (response is Map<String, dynamic>) {
      return WithdrawalResponseModel.fromJson(response);
    }

    throw ApiException(statusCode: 500, message: 'Failed to submit withdrawal request');
  }
}

