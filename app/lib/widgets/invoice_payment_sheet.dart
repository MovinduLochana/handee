import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/api_endpoints.dart';
import '../core/constants/colors.dart';
import '../data/models/invoice_model.dart';
import '../providers/payment_provider.dart';
import 'custom_button.dart';
import 'status_badge.dart';

class InvoicePaymentSheet extends StatefulWidget {
  final InvoiceModel invoice;
  final VoidCallback? onPaymentSuccess;

  const InvoicePaymentSheet({
    super.key,
    required this.invoice,
    this.onPaymentSuccess,
  });

  static Future<bool?> show(
    BuildContext context, {
    required InvoiceModel invoice,
    VoidCallback? onPaymentSuccess,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => InvoicePaymentSheet(
        invoice: invoice,
        onPaymentSuccess: onPaymentSuccess,
      ),
    );
  }

  @override
  State<InvoicePaymentSheet> createState() => _InvoicePaymentSheetState();
}

class _InvoicePaymentSheetState extends State<InvoicePaymentSheet> {
  bool _isProcessing = false;
  bool _isResetting = false;
  bool _isWaitingForPayHere = false;
  bool _isSuccess = false;
  late bool _isAlreadyPaid;
  String? _transactionRef;
  String? _errorMessage;

  Timer? _verificationTimer;
  final currencyFormat = NumberFormat('#,##0.00', 'en_US');

  @override
  void initState() {
    super.initState();
    _isAlreadyPaid = widget.invoice.isPaid;
  }

  @override
  void dispose() {
    _verificationTimer?.cancel();
    super.dispose();
  }

  void _startVerificationPolling() {
    _verificationTimer?.cancel();
    _verificationTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }

      final provider = context.read<PaymentProvider>();
      final isPaid = await provider.checkAndVerifyInvoicePaid(
        invoiceId: widget.invoice.id,
        bookingId: widget.invoice.bookingId,
      );

      if (isPaid && mounted) {
        timer.cancel();
        _verificationTimer = null;
        try {
          await closeInAppWebView();
        } catch (_) {}

        setState(() {
          _isWaitingForPayHere = false;
          _isSuccess = true;
          _transactionRef = 'ph_sbx_${DateTime.now().millisecondsSinceEpoch}';
        });
        widget.onPaymentSuccess?.call();
      }
    });
  }

  Future<void> _handlePayment() async {
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    final provider = context.read<PaymentProvider>();

    try {
      final checkoutUrl = ApiEndpoints.payHereCheckoutHtml(widget.invoice.id);
      final uri = Uri.parse(checkoutUrl);

      setState(() {
        _isProcessing = false;
        _isWaitingForPayHere = true;
      });

      _startVerificationPolling();

      // Launch in-app browser view
      final launched = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }

      // When the browser is closed (either by user or closeInAppWebView)
      if (mounted) {
        final isPaid = await provider.checkAndVerifyInvoicePaid(
          invoiceId: widget.invoice.id,
          bookingId: widget.invoice.bookingId,
        );

        if (isPaid && mounted) {
          _verificationTimer?.cancel();
          _verificationTimer = null;
          setState(() {
            _isWaitingForPayHere = false;
            _isSuccess = true;
            _transactionRef = 'ph_sbx_${DateTime.now().millisecondsSinceEpoch}';
          });
          widget.onPaymentSuccess?.call();
        }
      }
    } catch (e) {
      if (!mounted) return;
      _verificationTimer?.cancel();
      _verificationTimer = null;
      setState(() {
        _isProcessing = false;
        _isWaitingForPayHere = false;
        _errorMessage = 'Could not open PayHere checkout. Please try again.';
      });
    }
  }

  Future<void> _handleResetInvoice() async {
    setState(() {
      _isResetting = true;
      _errorMessage = null;
    });

    final provider = context.read<PaymentProvider>();
    final success = await provider.resetInvoiceForTesting(
      invoiceId: widget.invoice.id,
      bookingId: widget.invoice.bookingId,
    );

    if (!mounted) return;

    setState(() {
      _isResetting = false;
    });

    if (success) {
      setState(() {
        _isAlreadyPaid = false;
        _isWaitingForPayHere = false;
        _isSuccess = false;
        _errorMessage = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invoice reset to Unpaid. You can now test PayHere checkout again!'),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      setState(() {
        _errorMessage = provider.errorMessage ?? 'Failed to reset invoice.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            if (_isSuccess) ...[
              _buildSuccessView(),
            ] else if (_isAlreadyPaid) ...[
              _buildAlreadyPaidView(),
            ] else if (_isWaitingForPayHere) ...[
              _buildWaitingForPayHereView(),
            ] else ...[
              _buildCheckoutView(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAlreadyPaidView() {
    return Column(
      children: [
        const SizedBox(height: 12),
        Container(
          width: 64,
          height: 64,
          decoration: const BoxDecoration(
            color: AppColors.successLight,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check_circle_outline, color: AppColors.success, size: 36),
        ),
        const SizedBox(height: 16),
        const Text(
          'Invoice Already Settled',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Invoice #${widget.invoice.id.length >= 8 ? widget.invoice.id.substring(0, 8).toUpperCase() : widget.invoice.id} is already marked as Paid.',
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              _buildReceiptRow('Invoice Status', 'Paid (Settled)'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Total Amount', 'Rs. ${currencyFormat.format(widget.invoice.totalAmount)}'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Gateway', 'PayHere Sandbox (Sri Lanka)'),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (_errorMessage != null) ...[
          Container(
            padding: const EdgeInsets.all(10),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: AppColors.errorLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _errorMessage!,
              style: const TextStyle(color: AppColors.error, fontSize: 12),
            ),
          ),
        ],
        CustomButton(
          text: 'Reset to Unpaid & Retest PayHere',
          icon: Icons.refresh,
          isLoading: _isResetting,
          onPressed: _handleResetInvoice,
        ),
        const SizedBox(height: 10),
        Center(
          child: TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: AppColors.textSecondary)),
          ),
        ),
      ],
    );
  }

  Widget _buildWaitingForPayHereView() {
    return Column(
      children: [
        const SizedBox(height: 12),
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: AppColors.primaryUltraLight,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.primaryLight, width: 2),
          ),
          child: const Padding(
            padding: EdgeInsets.all(16.0),
            child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.primary),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Waiting for Payment...',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Please complete the transaction in PayHere.\nThis page will automatically verify and return once settled.',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              _buildReceiptRow('Gateway', 'PayHere Sandbox'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Amount Due', 'Rs. ${currencyFormat.format(widget.invoice.totalAmount)}'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Verification Status', 'Polling real-time settlement...'),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Center(
          child: TextButton(
            onPressed: () {
              _verificationTimer?.cancel();
              _verificationTimer = null;
              setState(() => _isWaitingForPayHere = false);
            },
            child: const Text('Cancel / Return to Invoice', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          ),
        ),
      ],
    );
  }

  Widget _buildCheckoutView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Job Quote & Invoice',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            StatusBadge(status: widget.invoice.status),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          'Invoice #${widget.invoice.id.length >= 8 ? widget.invoice.id.substring(0, 8).toUpperCase() : widget.invoice.id}',
          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        const SizedBox(height: 16),

        // Itemized Cost Breakdown Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              ...widget.invoice.lineItems.map((item) {
                final isUrgency = item.type?.toLowerCase() == 'urgency' ||
                    item.item.toLowerCase().contains('priority') ||
                    item.item.toLowerCase().contains('surcharge');
                final isFee = item.type?.toLowerCase() == 'fee';
                String subtitle = 'Disbursed directly to tradesperson upon completion';
                if (isUrgency) {
                  subtitle = 'Priority dispatch rush compensation for immediate service';
                } else if (isFee) {
                  subtitle = 'Covers background vetting, guarantee & support';
                }
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildBreakdownRow(
                    item.item,
                    '${isUrgency && item.price > 0 ? "+" : ""}Rs. ${currencyFormat.format(item.price)}',
                    subtitle: subtitle,
                    isUrgency: isUrgency,
                  ),
                );
              }),
              const Divider(color: AppColors.border, height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total Approved Price',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    'Rs. ${currencyFormat.format(widget.invoice.totalAmount)}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // PayHere Gateway Info Card (Sole Payment Method)
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.primaryUltraLight,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppColors.primary,
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.account_balance_wallet, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'PayHere Sandbox',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'SECURE GATEWAY',
                            style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Official Sri Lanka Gateway • LKR Settlement',
                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
            ],
          ),
        ),

        if (_errorMessage != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.errorLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: AppColors.error, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 24),

        // Action Button
        CustomButton(
          text: 'Pay via PayHere (Rs. ${currencyFormat.format(widget.invoice.totalAmount)})',
          icon: Icons.open_in_browser,
          isLoading: _isProcessing,
          onPressed: _handlePayment,
        ),
        const SizedBox(height: 10),
        const Center(
          child: Text(
            'Secured by PayHere Sandbox (Sri Lanka)',
            style: TextStyle(fontSize: 11, color: AppColors.textMuted),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessView() {
    return Column(
      children: [
        const SizedBox(height: 12),
        Container(
          width: 64,
          height: 64,
          decoration: const BoxDecoration(
            color: AppColors.successLight,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check, color: AppColors.success, size: 36),
        ),
        const SizedBox(height: 16),
        const Text(
          'Payment Successful!',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Invoice #${widget.invoice.id.length >= 8 ? widget.invoice.id.substring(0, 8).toUpperCase() : widget.invoice.id} has been settled in full.',
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              _buildReceiptRow('Transaction Ref', _transactionRef ?? 'ph_sbx_mock'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Amount Paid', 'Rs. ${currencyFormat.format(widget.invoice.totalAmount)}'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Payment Gateway', 'PayHere Sandbox'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Status', 'Succeeded (Ledger Credited)'),
            ],
          ),
        ),

        const SizedBox(height: 24),

        CustomButton(
          text: 'Done',
          onPressed: () => Navigator.pop(context, true),
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildBreakdownRow(String title, String amount, {String? subtitle, bool isUrgency = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                if (isUrgency) ...[
                  const Icon(Icons.bolt, size: 14, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 4),
                ],
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isUrgency ? FontWeight.w700 : FontWeight.w600,
                    color: isUrgency ? const Color(0xFFD97706) : AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            Text(
              amount,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isUrgency ? const Color(0xFFD97706) : AppColors.textPrimary,
              ),
            ),
          ],
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
          ),
        ],
      ],
    );
  }

  Widget _buildReceiptRow(String title, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        Text(
          value,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
      ],
    );
  }
}
