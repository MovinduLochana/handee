import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/models/payout_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/payment_provider.dart';

const List<String> sriLankanBanks = [
  'Commercial Bank of Ceylon',
  'Sampath Bank',
  'Bank of Ceylon (BOC)',
  'Hatton National Bank (HNB)',
  "People's Bank",
  'Nations Trust Bank (NTB)',
  'Seylan Bank',
  'National Development Bank (NDB)',
  'DFCC Bank',
  'Pan Asia Bank',
  'Union Bank of Colombo',
  'Amana Bank',
  'Cargills Bank',
  'Standard Chartered Bank',
  'HSBC Sri Lanka',
  'Other / Foreign Bank',
];

class ProviderPayoutManagementScreen extends StatefulWidget {
  const ProviderPayoutManagementScreen({super.key});

  @override
  State<ProviderPayoutManagementScreen> createState() =>
      _ProviderPayoutManagementScreenState();
}

class _ProviderPayoutManagementScreenState
    extends State<ProviderPayoutManagementScreen> {
  final NumberFormat _currencyFormat = NumberFormat('#,##0.00', 'en_US');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    final paymentProv = context.read<PaymentProvider>();
    await Future.wait([
      paymentProv.fetchProviderEarningsSummary(),
      paymentProv.fetchProviderPayouts(),
      paymentProv.fetchBankAccount(),
    ]);
  }

  void _openBankDetailsSheet([ProviderBankAccountModel? currentBank]) {
    final authUser = context.read<AuthProvider>().currentUser;
    final defaultHolderName = currentBank?.accountHolderName ?? authUser?.fullName ?? '';
    final defaultBankName = currentBank?.bankName ?? sriLankanBanks.first;

    String selectedBank = sriLankanBanks.contains(defaultBankName)
        ? defaultBankName
        : sriLankanBanks.first;
    final branchController = TextEditingController(text: currentBank?.branchName ?? '');
    final branchCodeController = TextEditingController(text: currentBank?.branchCode ?? '');
    final accountNumController = TextEditingController(text: currentBank?.accountNumber ?? '');
    final holderController = TextEditingController(text: defaultHolderName);

    String? sheetError;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) => StatefulBuilder(
        builder: (context, setModalState) {
          final isEditing = currentBank != null;

          return Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(bottomSheetContext).viewInsets.bottom + 20,
              top: 24,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primaryUltraLight,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.account_balance, color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isEditing ? 'Edit Bank Account' : 'Link Sri Lankan Bank Account',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                            ),
                            const Text(
                              'Earnings are deposited directly via CEFT / SLIPS',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  if (sheetError != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: AppColors.errorLight,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.error.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppColors.error, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              sheetError!,
                              style: const TextStyle(color: AppColors.error, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),

                  const Text('Select Bank', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: selectedBank,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                    items: sriLankanBanks
                        .map((b) => DropdownMenuItem(value: b, child: Text(b, style: const TextStyle(fontSize: 14))))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setModalState(() => selectedBank = val);
                    },
                  ),
                  const SizedBox(height: 14),

                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Branch Name', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            const SizedBox(height: 6),
                            TextField(
                              controller: branchController,
                              decoration: InputDecoration(
                                hintText: 'e.g. Kollupitiya',
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                filled: true,
                                fillColor: Colors.grey.shade50,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 1,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Code (Opt)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            const SizedBox(height: 6),
                            TextField(
                              controller: branchCodeController,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                hintText: '042',
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                filled: true,
                                fillColor: Colors.grey.shade50,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  const Text('Account Number', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: accountNumController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: 'e.g. 8102345678',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                  ),
                  const SizedBox(height: 14),

                  const Text('Account Holder Name', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: holderController,
                    decoration: InputDecoration(
                      hintText: 'Must match official bank account title',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final branch = branchController.text.trim();
                              final accNum = accountNumController.text.trim();
                              final holder = holderController.text.trim();

                              if (branch.isEmpty || accNum.isEmpty || holder.isEmpty) {
                                setModalState(() {
                                  sheetError = 'Branch name, account number, and holder name are required.';
                                });
                                return;
                              }

                              setModalState(() {
                                isSubmitting = true;
                                sheetError = null;
                              });

                              final paymentProv = context.read<PaymentProvider>();
                              final success = await paymentProv.saveBankAccount(
                                bankName: selectedBank,
                                branchName: branch,
                                branchCode: branchCodeController.text.trim().isNotEmpty
                                    ? branchCodeController.text.trim()
                                    : null,
                                accountNumber: accNum,
                                accountHolderName: holder,
                              );

                              if (!mounted) return;

                              if (success) {
                                Navigator.pop(bottomSheetContext);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Bank account saved: $selectedBank'),
                                    backgroundColor: AppColors.success,
                                  ),
                                );
                              } else {
                                setModalState(() {
                                  isSubmitting = false;
                                  sheetError = paymentProv.errorMessage ?? 'Failed to save bank details.';
                                });
                              }
                            },
                      child: isSubmitting
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Text(isEditing ? 'Save Changes' : 'Link Bank Account',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _openWithdrawSheet(double availableBalance, ProviderBankAccountModel bank) {
    final amountController = TextEditingController(
      text: availableBalance.toStringAsFixed(2),
    );
    String? withdrawError;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(bottomSheetContext).viewInsets.bottom + 20,
              top: 24,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.successLight,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.arrow_upward, color: AppColors.success, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Request Payout Withdrawal',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                            ),
                            Text(
                              'Queued for direct CEFT deposit to your bank',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  if (withdrawError != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: AppColors.errorLight,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.error.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppColors.error, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              withdrawError!,
                              style: const TextStyle(color: AppColors.error, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Destination Bank Card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance, color: AppColors.primary, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(bank.bankName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              Text(
                                'A/C: •••• ${bank.accountNumber.length > 4 ? bank.accountNumber.substring(bank.accountNumber.length - 4) : bank.accountNumber} (${bank.accountHolderName})',
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Withdrawal Amount (LKR)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      InkWell(
                        onTap: () {
                          amountController.text = availableBalance.toStringAsFixed(2);
                        },
                        child: Text(
                          'Available: Rs. ${_currencyFormat.format(availableBalance)}',
                          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      prefixText: 'Rs. ',
                      prefixStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      suffixIcon: TextButton(
                        onPressed: () {
                          amountController.text = availableBalance.toStringAsFixed(2);
                        },
                        child: const Text('MAX', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final raw = amountController.text.trim();
                              final parsed = double.tryParse(raw);
                              if (parsed == null || parsed <= 0) {
                                setModalState(() {
                                  withdrawError = 'Please enter a valid amount.';
                                });
                                return;
                              }
                              if (parsed > availableBalance) {
                                setModalState(() {
                                  withdrawError = 'Amount exceeds available balance of Rs. ${_currencyFormat.format(availableBalance)}.';
                                });
                                return;
                              }

                              setModalState(() {
                                isSubmitting = true;
                                withdrawError = null;
                              });

                              final paymentProv = context.read<PaymentProvider>();
                              final resp = await paymentProv.requestWithdrawal(amount: parsed);

                              if (!mounted) return;

                              if (resp != null) {
                                Navigator.pop(bottomSheetContext);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Withdrawal of Rs. ${_currencyFormat.format(resp.amountRequested)} submitted! (Ref: ${resp.batchReference})',
                                    ),
                                    backgroundColor: AppColors.success,
                                    duration: const Duration(seconds: 4),
                                  ),
                                );
                              } else {
                                setModalState(() {
                                  isSubmitting = false;
                                  withdrawError = paymentProv.errorMessage ?? 'Withdrawal request failed.';
                                });
                              }
                            },
                      child: isSubmitting
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Confirm Withdrawal',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final paymentProv = context.watch<PaymentProvider>();
    final summary = paymentProv.providerEarningsSummary;
    final bank = paymentProv.bankAccount;
    final payouts = paymentProv.providerPayouts;
    final completedPayouts = payouts
        .where((p) => p.status.toLowerCase() == 'completed' || p.status.toLowerCase() == 'withdrawn')
        .toList();

    final totalEarnings = summary?.totalEarnings ?? 0.0;
    final availableBalance = summary?.availableBalance ?? 0.0;
    final pendingPayouts = summary?.pendingPayouts ?? 0.0;
    final completedJobs = summary?.completedJobsCount ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Earnings & Payouts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Ledger',
            onPressed: _loadData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Metrics Grid
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Total Net Earnings',
                      value: 'Rs. ${_currencyFormat.format(totalEarnings)}',
                      icon: Icons.payments,
                      color: AppColors.success,
                      backgroundColor: AppColors.successLight,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Available for Payout',
                      value: 'Rs. ${_currencyFormat.format(availableBalance)}',
                      icon: Icons.account_balance_wallet,
                      color: AppColors.primary,
                      backgroundColor: AppColors.primaryUltraLight,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Pending Settlement',
                      value: 'Rs. ${_currencyFormat.format(pendingPayouts)}',
                      icon: Icons.schedule,
                      color: AppColors.warning,
                      backgroundColor: AppColors.warningLight,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Paid Bookings',
                      value: '$completedJobs ${completedJobs == 1 ? 'Job' : 'Jobs'}',
                      icon: Icons.task_alt,
                      color: AppColors.secondary,
                      backgroundColor: Colors.purple.shade50,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Bank Account Card
              const Text(
                'Linked Bank Details',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),

              if (bank != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.primaryUltraLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.account_balance, color: AppColors.primary, size: 24),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  bank.bankName,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                const SizedBox(height: 2),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.successLight,
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: AppColors.success.withOpacity(0.3)),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.check_circle, size: 11, color: AppColors.success),
                                      SizedBox(width: 4),
                                      Text(
                                        'Ready for CEFT Direct Deposit',
                                        style: TextStyle(
                                          color: AppColors.success,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const Divider(height: 1),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Account Number', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                          Text(
                            '•••• ${bank.accountNumber.length > 4 ? bank.accountNumber.substring(bank.accountNumber.length - 4) : bank.accountNumber}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Branch', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                          Text(
                            bank.branchName + (bank.branchCode != null ? ' (${bank.branchCode})' : ''),
                            style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Account Holder', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                          Text(
                            bank.accountHolderName,
                            style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              icon: const Icon(Icons.edit, size: 16),
                              label: const Text('Edit Details'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                side: const BorderSide(color: AppColors.border),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: () => _openBankDetailsSheet(bank),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton.icon(
                              icon: const Icon(Icons.arrow_upward, size: 16),
                              label: const Text('Withdraw'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.success,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: availableBalance > 0
                                  ? () => _openWithdrawSheet(availableBalance, bank)
                                  : null,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.warning.withOpacity(0.3)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.warningLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 24),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'No Bank Account Linked',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                Text(
                                  'Link your Sri Lankan bank account to request payouts directly to your account.',
                                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.add_link, size: 18),
                          label: const Text('Link Bank Account Now'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () => _openBankDetailsSheet(),
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 24),

              // Transparent Platform Share Banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primaryUltraLight,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.verified_user_outlined, color: AppColors.primary, size: 28),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '85% Net Provider Revenue Share',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryDark),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Handee charges a transparent 15% platform commission. 85% of customer payment is credited directly to your ledger upon completion.',
                            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Payout Activity Header - Only Completed Disbursements
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Recent Completed Payouts',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  Text(
                    '${completedPayouts.length} ${completedPayouts.length == 1 ? 'Record' : 'Records'}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              if (completedPayouts.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 44, color: Colors.grey.shade400),
                      const SizedBox(height: 10),
                      const Text(
                        'No Completed Payouts Yet',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Completed bank disbursements will appear here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: completedPayouts.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final item = completedPayouts[index];
                    return _buildPayoutTile(item);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required Color backgroundColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title.toUpperCase(),
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted),
              ),
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(color: backgroundColor, shape: BoxShape.circle),
                child: Icon(icon, size: 14, color: color),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color, fontFamily: 'monospace'),
          ),
        ],
      ),
    );
  }

  Widget _buildPayoutTile(PayoutModel item) {
    Color statusColor;
    Color statusBg;
    switch (item.status.toLowerCase()) {
      case 'completed':
        statusColor = AppColors.success;
        statusBg = AppColors.successLight;
        break;
      case 'withdrawn':
        statusColor = const Color(0xFF7C3AED); // violet-600
        statusBg = const Color(0xFFEDE9FE); // violet-100
        break;
      case 'processing':
        statusColor = AppColors.primary;
        statusBg = AppColors.primaryUltraLight;
        break;
      default:
        statusColor = AppColors.warning;
        statusBg = AppColors.warningLight;
    }

    final formattedDate = DateFormat('MMM d, yyyy • h:mm a').format(item.createdAt);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: statusBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              item.status.toLowerCase() == 'completed'
                  ? Icons.check_circle_outline
                  : (item.status.toLowerCase() == 'withdrawn'
                      ? Icons.account_balance_outlined
                      : (item.status.toLowerCase() == 'processing'
                          ? Icons.hourglass_top
                          : Icons.pending_outlined)),
              color: statusColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      item.payoutBatchId ?? item.id.substring(0, item.id.length > 8 ? 8 : item.id.length),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace'),
                    ),
                    Text(
                      '+Rs. ${_currencyFormat.format(item.netAmount)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.success),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      formattedDate,
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: statusColor.withOpacity(0.3)),
                      ),
                      child: Text(
                        item.status,
                        style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
