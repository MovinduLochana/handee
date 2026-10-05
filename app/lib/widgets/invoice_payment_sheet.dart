import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
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
  String _selectedMethod = 'payhere'; // 'payhere' or 'card'
  String get _selectedGateway =>
      _selectedMethod == 'payhere' ? 'PayHere Sandbox' : 'Stripe Sandbox';

  bool _isProcessing = false;
  bool _isResetting = false;
  bool _isWaitingForPayHere = false;
  bool _isSuccess = false;
  late bool _isAlreadyPaid;
  String? _transactionRef;
  String? _errorMessage;

  final currencyFormat = NumberFormat('#,##0.00', 'en_US');

  @override
  void initState() {
    super.initState();
    _isAlreadyPaid = widget.invoice.isPaid;
  }

  Future<void> _handlePayment() async {
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    final provider = context.read<PaymentProvider>();

    if (_selectedMethod == 'payhere') {
      // Launch PayHere Sandbox checkout in browser.
      // Do NOT confirm immediately! Transition to waiting state so user can enter credentials in PayHere.
      final launched = await provider.launchPayHereCheckout(
        invoiceId: widget.invoice.id,
        bookingId: widget.invoice.bookingId,
      );

      if (!mounted) return;

      if (launched) {
        setState(() {
          _isProcessing = false;
          _isWaitingForPayHere = true;
        });
      } else {
        setState(() {
          _isProcessing = false;
          _errorMessage =
              provider.errorMessage ?? 'Could not open PayHere checkout. Please try again.';
        });
      }
    } else {
      // Instant card mock simulation
      final payment = await provider.processSandboxPayment(
        invoiceId: widget.invoice.id,
        bookingId: widget.invoice.bookingId,
        gatewayProvider: 'Stripe Sandbox',
        cardLast4: '4242',
      );

      if (!mounted) return;

      if (payment != null && payment.isSucceeded) {
        setState(() {
          _isProcessing = false;
          _isSuccess = true;
          _transactionRef = payment.transactionReference;
        });
        widget.onPaymentSuccess?.call();
      } else {
        setState(() {
          _isProcessing = false;
          _errorMessage =
              provider.errorMessage ?? 'Payment failed. Please try again.';
        });
      }
    }
  }

  Future<void> _handleConfirmPayHere() async {
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    final provider = context.read<PaymentProvider>();
    final payment = await provider.confirmPayHerePayment(
      invoiceId: widget.invoice.id,
      bookingId: widget.invoice.bookingId,
    );

    if (!mounted) return;

    if (payment != null && payment.isSucceeded) {
      setState(() {
        _isProcessing = false;
        _isWaitingForPayHere = false;
        _isSuccess = true;
        _transactionRef = payment.transactionReference;
      });
      widget.onPaymentSuccess?.call();
    } else {
      setState(() {
        _isProcessing = false;
        _errorMessage = provider.errorMessage ??
            'Could not verify PayHere payment. Please make sure payment is completed.';
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
          content: Text(
              'Invoice reset to Unpaid. You can now test the PayHere gateway again!'),
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
          child: const Icon(Icons.check_circle_outline,
              color: AppColors.success, size: 36),
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
              _buildReceiptRow('Total Amount',
                  'Rs. ${currencyFormat.format(widget.invoice.totalAmount)}'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Environment', 'Sandbox / Testing'),
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
          text: 'Reset to Unpaid & Retest Gateway',
          icon: Icons.refresh,
          isLoading: _isResetting,
          onPressed: _handleResetInvoice,
        ),
        const SizedBox(height: 10),
        Center(
          child: TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close',
                style: TextStyle(color: AppColors.textSecondary)),
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
          child: const Icon(Icons.open_in_browser,
              color: AppColors.primary, size: 34),
        ),
        const SizedBox(height: 16),
        const Text(
          'PayHere Gateway Opened',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'The PayHere sandbox checkout has opened in your browser.\nComplete payment with sandbox credentials, then return here to finalize.',
          style: TextStyle(
              fontSize: 13, color: AppColors.textSecondary, height: 1.4),
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
              _buildReceiptRow('Gateway', 'PayHere Sandbox (Sri Lanka)'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Amount Due',
                  'Rs. ${currencyFormat.format(widget.invoice.totalAmount)}'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Status', 'Awaiting Customer Completion'),
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
          text: 'I Have Completed Payment',
          icon: Icons.verified_user,
          isLoading: _isProcessing,
          onPressed: _handleConfirmPayHere,
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextButton.icon(
              onPressed: () {
                final provider = context.read<PaymentProvider>();
                provider.launchPayHereCheckout(
                  invoiceId: widget.invoice.id,
                  bookingId: widget.invoice.bookingId,
                );
              },
              icon: const Icon(Icons.refresh, size: 16, color: AppColors.primary),
              label: const Text('Re-open Gateway',
                  style: TextStyle(color: AppColors.primary, fontSize: 13)),
            ),
            const SizedBox(width: 16),
            TextButton(
              onPressed: () => setState(() => _isWaitingForPayHere = false),
              child: const Text('Cancel / Change Method',
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 13)),
            ),
          ],
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
                String subtitle =
                    'Disbursed directly to tradesperson upon completion';
                if (isUrgency) {
                  subtitle =
                      'Priority dispatch rush compensation for immediate service';
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

        // Payment Method Selector
        const Text(
          'Payment Method',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),

        // PayHere Gateway Option (Default)
        InkWell(
          onTap: () => setState(() => _selectedMethod = 'payhere'),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _selectedMethod == 'payhere'
                  ? AppColors.primaryUltraLight
                  : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _selectedMethod == 'payhere'
                    ? AppColors.primary
                    : AppColors.border,
                width: _selectedMethod == 'payhere' ? 1.5 : 1.0,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _selectedMethod == 'payhere'
                        ? Colors.white
                        : AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.account_balance_wallet,
                      color: AppColors.primary, size: 24),
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
                            style: TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'GATEWAY',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Real LKR Checkout • MD5 Signature Verified',
                        style: TextStyle(
                            fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _selectedMethod == 'payhere'
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: _selectedMethod == 'payhere'
                      ? AppColors.primary
                      : AppColors.textMuted,
                  size: 20,
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 10),

        // Instant Test Card Option
        InkWell(
          onTap: () => setState(() => _selectedMethod = 'card'),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _selectedMethod == 'card'
                  ? AppColors.primaryUltraLight
                  : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _selectedMethod == 'card'
                    ? AppColors.primary
                    : AppColors.border,
                width: _selectedMethod == 'card' ? 1.5 : 1.0,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _selectedMethod == 'card'
                        ? Colors.white
                        : AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.credit_card,
                      color: AppColors.textSecondary, size: 24),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Instant Card Simulator',
                        style: TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                      SizedBox(height: 2),
                      Text(
                        '•••• 4242 (Direct mock approval)',
                        style: TextStyle(
                            fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _selectedMethod == 'card'
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: _selectedMethod == 'card'
                      ? AppColors.primary
                      : AppColors.textMuted,
                  size: 20,
                ),
              ],
            ),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.error_outline,
                        color: AppColors.error, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(
                            color: AppColors.error,
                            fontSize: 12,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                if (_errorMessage!.toLowerCase().contains('already been paid') ||
                    _errorMessage!.toLowerCase().contains('already paid')) ...[
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        backgroundColor: Colors.white,
                      ),
                      onPressed: _handleResetInvoice,
                      icon: const Icon(Icons.refresh,
                          size: 14, color: AppColors.error),
                      label: const Text('Reset Invoice to Unpaid',
                          style: TextStyle(
                              fontSize: 12,
                              color: AppColors.error,
                              fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],

        const SizedBox(height: 24),

        // Action Button
        CustomButton(
          text: _selectedMethod == 'payhere'
              ? 'Proceed to PayHere Gateway (Rs. ${currencyFormat.format(widget.invoice.totalAmount)})'
              : 'Authorize Mock Payment (Rs. ${currencyFormat.format(widget.invoice.totalAmount)})',
          icon: _selectedMethod == 'payhere'
              ? Icons.open_in_browser
              : Icons.lock,
          isLoading: _isProcessing,
          onPressed: _handlePayment,
        ),
        const SizedBox(height: 10),
        Center(
          child: Text(
            _selectedMethod == 'payhere'
                ? 'Secured by PayHere Sandbox (Sri Lanka)'
                : 'Simulated Sandbox Provider',
            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
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
              _buildReceiptRow('Transaction Ref',
                  _transactionRef ?? 'ph_sbx_mock'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Amount Paid',
                  'Rs. ${currencyFormat.format(widget.invoice.totalAmount)}'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Payment Gateway', _selectedGateway),
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

  Widget _buildBreakdownRow(String title, String amount,
      {String? subtitle, bool isUrgency = false}) {
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
                    color: isUrgency
                        ? const Color(0xFFD97706)
                        : AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            Text(
              amount,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isUrgency
                    ? const Color(0xFFD97706)
                    : AppColors.textPrimary,
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
          style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary),
        ),
      ],
    );
  }
}
