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
  final String _selectedGateway = 'Stripe Sandbox';
  bool _isProcessing = false;
  bool _isSuccess = false;
  String? _transactionRef;
  String? _errorMessage;

  final currencyFormat = NumberFormat('#,##0.00', 'en_US');

  Future<void> _handlePayment() async {
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    final provider = context.read<PaymentProvider>();
    final payment = await provider.processSandboxPayment(
      invoiceId: widget.invoice.id,
      bookingId: widget.invoice.bookingId,
      gatewayProvider: _selectedGateway,
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
        _errorMessage = provider.errorMessage ?? 'Payment failed. Please try again.';
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
            ] else ...[
              _buildCheckoutView(),
            ],
          ],
        ),
      ),
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
          'Invoice #${widget.invoice.id.substring(0, 8).toUpperCase()}',
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

        // Sandbox Payment Gateway Selector
        const Text(
          'Sandbox Payment Method',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),

        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.primaryLight),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primaryUltraLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.credit_card, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Visa Sandbox Test Card',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                    SizedBox(height: 2),
                    Text(
                      '•••• •••• •••• 4242 (Simulated 3DS)',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
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
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.errorLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: AppColors.error, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppColors.error, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 24),

        // Action Button
        CustomButton(
          text: 'Authorize Payment (Rs. ${currencyFormat.format(widget.invoice.totalAmount)})',
          icon: Icons.lock,
          isLoading: _isProcessing,
          onPressed: _handlePayment,
        ),
        const SizedBox(height: 10),
        const Center(
          child: Text(
            'Sandbox Gateway • Protected by Polly Exponential Retry Policy',
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
          'Invoice #${widget.invoice.id.substring(0, 8).toUpperCase()} has been settled in full.',
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
              _buildReceiptRow('Transaction Ref', _transactionRef ?? 'ch_sbx_mock'),
              const Divider(color: AppColors.borderLight, height: 16),
              _buildReceiptRow('Amount Paid', 'Rs. ${currencyFormat.format(widget.invoice.totalAmount)}'),
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
