import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/invoice_model.dart';

class InvoiceRepository {
  final ApiClient apiClient;

  InvoiceRepository({
    required this.apiClient,
  });

  /// Fetches the itemized invoice for a specific booking.
  Future<InvoiceModel?> getInvoiceByBookingId(String bookingId) async {
    try {
      final response = await apiClient.get(ApiEndpoints.invoiceByBookingId(bookingId));
      if (response is Map<String, dynamic>) {
        return InvoiceModel.fromJson(response);
      }
      return null;
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Fetches an invoice by its unique GUID id.
  Future<InvoiceModel?> getInvoiceById(String id) async {
    try {
      final response = await apiClient.get(ApiEndpoints.invoiceById(id));
      if (response is Map<String, dynamic>) {
        return InvoiceModel.fromJson(response);
      }
      return null;
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Fetches all invoices belonging to the currently authenticated customer.
  Future<List<InvoiceModel>> getMyInvoices() async {
    final response = await apiClient.get(ApiEndpoints.myInvoices);
    if (response is List) {
      return response
          .map((e) => InvoiceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Creates an invoice for a booking (Provider action).
  Future<InvoiceModel> createInvoice({
    required String bookingId,
    required double baseAmount,
    String? lineItemsJson,
  }) async {
    final response = await apiClient.post(
      ApiEndpoints.invoices,
      body: {
        'bookingId': bookingId,
        'baseAmount': baseAmount,
        'lineItemsJson': lineItemsJson,
      },
    );

    if (response is Map<String, dynamic>) {
      return InvoiceModel.fromJson(response);
    }

    throw ApiException(statusCode: 500, message: 'Failed to create invoice');
  }
}
