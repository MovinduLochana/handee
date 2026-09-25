import 'package:flutter/material.dart';
import '../data/models/invoice_model.dart';
import '../data/models/payment_model.dart';
import '../data/repositories/invoice_repository.dart';
import '../data/repositories/payment_repository.dart';

class PaymentProvider extends ChangeNotifier {
  final InvoiceRepository invoiceRepo;
  final PaymentRepository paymentRepo;

  final Map<String, InvoiceModel> _invoicesByBooking = {};
  List<InvoiceModel> _myInvoices = [];
  List<PaymentModel> _myPayments = [];

  bool _isLoading = false;
  bool _isProcessing = false;
  String? _errorMessage;
  PaymentModel? _lastPaymentResult;

  PaymentProvider({
    required this.invoiceRepo,
    required this.paymentRepo,
  });

  bool get isLoading => _isLoading;
  bool get isProcessing => _isProcessing;
  String? get errorMessage => _errorMessage;
  PaymentModel? get lastPaymentResult => _lastPaymentResult;

  List<InvoiceModel> get myInvoices => _myInvoices;
  List<PaymentModel> get myPayments => _myPayments;

  InvoiceModel? getInvoiceForBooking(String bookingId) => _invoicesByBooking[bookingId];

  Future<InvoiceModel?> fetchInvoiceForBooking(String bookingId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final invoice = await invoiceRepo.getInvoiceByBookingId(bookingId);
      if (invoice != null) {
        _invoicesByBooking[bookingId] = invoice;
      }
      _isLoading = false;
      notifyListeners();
      return invoice;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<void> fetchMyInvoices() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _myInvoices = await invoiceRepo.getMyInvoices();
      for (final inv in _myInvoices) {
        _invoicesByBooking[inv.bookingId] = inv;
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchMyPayments() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _myPayments = await paymentRepo.getMyPayments();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Executes sandbox payment against backend with Polly retry resilience.
  /// Updates local invoice status to 'Paid' upon successful transaction.
  Future<PaymentModel?> processSandboxPayment({
    required String invoiceId,
    required String bookingId,
    String paymentMethod = 'card',
    String cardLast4 = '4242',
    String gatewayProvider = 'Stripe Sandbox',
  }) async {
    _isProcessing = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final payment = await paymentRepo.processPayment(
        invoiceId: invoiceId,
        paymentMethod: paymentMethod,
        cardLast4: cardLast4,
        gatewayProvider: gatewayProvider,
      );

      _lastPaymentResult = payment;

      // Update cached invoice to Paid status
      final currentInvoice = _invoicesByBooking[bookingId];
      if (currentInvoice != null) {
        _invoicesByBooking[bookingId] = InvoiceModel(
          id: currentInvoice.id,
          bookingId: currentInvoice.bookingId,
          customerId: currentInvoice.customerId,
          customerName: currentInvoice.customerName,
          providerId: currentInvoice.providerId,
          providerName: currentInvoice.providerName,
          baseAmount: currentInvoice.baseAmount,
          platformFee: currentInvoice.platformFee,
          totalAmount: currentInvoice.totalAmount,
          currency: currentInvoice.currency,
          status: 'Paid',
          adminApprovalStatus: currentInvoice.adminApprovalStatus,
          lineItemsJson: currentInvoice.lineItemsJson,
          dueAt: currentInvoice.dueAt,
          paidAt: DateTime.now(),
          createdAt: currentInvoice.createdAt,
        );
      }

      _myPayments.insert(0, payment);
      _isProcessing = false;
      notifyListeners();
      return payment;
    } catch (e) {
      _errorMessage = e.toString();
      _isProcessing = false;
      notifyListeners();
      return null;
    }
  }
}
