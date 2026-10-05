import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app/core/network/api_client.dart';
import 'package:app/core/services/storage_service.dart';
import 'package:app/data/models/payout_model.dart';
import 'package:app/data/repositories/auth_repository.dart';
import 'package:app/data/repositories/invoice_repository.dart';
import 'package:app/data/repositories/payment_repository.dart';
import 'package:app/providers/auth_provider.dart';
import 'package:app/providers/payment_provider.dart';
import 'package:app/screens/provider/provider_payout_management_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'auth_access_token': 'test-token',
      'user_id': 'prov-001',
      'user_name': 'Samantha Silva',
      'user_role': 'Provider',
    });
    storage = await StorageService.getInstance();
  });

  group('Provider Bank Details & Withdrawal Models & Repository Tests', () {
    test('ProviderBankAccountModel serializes and deserializes correctly', () {
      final json = {
        'bankName': 'Commercial Bank of Ceylon',
        'branchName': 'Kollupitiya',
        'branchCode': '042',
        'accountNumber': '8102345678',
        'accountHolderName': 'Samantha Silva',
        'updatedAt': '2026-10-05T12:00:00Z',
      };

      final model = ProviderBankAccountModel.fromJson(json);
      expect(model.bankName, equals('Commercial Bank of Ceylon'));
      expect(model.branchName, equals('Kollupitiya'));
      expect(model.branchCode, equals('042'));
      expect(model.accountNumber, equals('8102345678'));
      expect(model.accountHolderName, equals('Samantha Silva'));

      final serialized = model.toJson();
      expect(serialized['bankName'], equals('Commercial Bank of Ceylon'));
      expect(serialized['accountNumber'], equals('8102345678'));
    });

    test('WithdrawalResponseModel deserializes correctly', () {
      final json = {
        'batchReference': 'WTH-20261005-AB12CD',
        'amountRequested': 25000.0,
        'payoutsCount': 3,
        'status': 'Processing',
        'requestedAt': '2026-10-05T14:30:00Z',
      };

      final model = WithdrawalResponseModel.fromJson(json);
      expect(model.batchReference, equals('WTH-20261005-AB12CD'));
      expect(model.amountRequested, equals(25000.0));
      expect(model.payoutsCount, equals(3));
      expect(model.status, equals('Processing'));
    });

    test('PaymentRepository gets and saves bank account via mock HTTP client', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/payouts/bank-account') {
          if (request.method == 'GET') {
            return http.Response(
              jsonEncode({
                'bankName': 'Sampath Bank',
                'branchName': 'Bambalapitiya',
                'accountNumber': '100123456789',
                'accountHolderName': 'Samantha Silva',
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          } else if (request.method == 'POST') {
            final body = jsonDecode(request.body);
            return http.Response(
              jsonEncode({
                ...body,
                'updatedAt': DateTime.now().toIso8601String(),
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
        }
        if (request.url.path == '/api/payouts/request-withdrawal' && request.method == 'POST') {
          final body = jsonDecode(request.body);
          return http.Response(
            jsonEncode({
              'batchReference': 'WTH-20261005-999999',
              'amountRequested': body['amount'] ?? 15000.0,
              'payoutsCount': 2,
              'status': 'Processing',
              'requestedAt': DateTime.now().toIso8601String(),
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
      final repo = PaymentRepository(apiClient: apiClient);

      final bank = await repo.getProviderBankAccount();
      expect(bank, isNotNull);
      expect(bank!.bankName, equals('Sampath Bank'));

      final saved = await repo.saveProviderBankAccount(
        bankName: 'Hatton National Bank (HNB)',
        branchName: 'Nugegoda',
        accountNumber: '200199998888',
        accountHolderName: 'Samantha Silva',
      );
      expect(saved.bankName, equals('Hatton National Bank (HNB)'));
      expect(saved.branchName, equals('Nugegoda'));

      final withdrawal = await repo.requestWithdrawal(amount: 15000.0);
      expect(withdrawal.batchReference, equals('WTH-20261005-999999'));
      expect(withdrawal.amountRequested, equals(15000.0));
      expect(withdrawal.status, equals('Processing'));
    });
  });

  group('ProviderPayoutManagementScreen Widget Tests', () {
    testWidgets('Renders ProviderPayoutManagementScreen with linked bank details, metrics, and history', (tester) async {
      final mockSummary = {
        'providerId': 'prov-001',
        'totalEarnings': 85000.0,
        'availableBalance': 25000.0,
        'pendingPayouts': 12000.0,
        'completedJobsCount': 15,
        'bankAccount': {
          'bankName': 'Commercial Bank of Ceylon',
          'branchName': 'Kollupitiya',
          'branchCode': '042',
          'accountNumber': '8102345678',
          'accountHolderName': 'Samantha Silva',
        },
        'recentPayouts': [
          {
            'id': 'payout-101',
            'providerId': 'prov-001',
            'bookingId': 'book-1',
            'grossAmount': 10000.0,
            'platformFeeDeducted': 1500.0,
            'netAmount': 8500.0,
            'status': 'Completed',
            'payoutBatchId': 'PAY-001',
            'createdAt': DateTime.now().toIso8601String(),
          },
          {
            'id': 'payout-102',
            'providerId': 'prov-001',
            'bookingId': 'book-2',
            'grossAmount': 5000.0,
            'platformFeeDeducted': 750.0,
            'netAmount': 4250.0,
            'status': 'Pending',
            'payoutBatchId': 'PAY-PENDING-99',
            'createdAt': DateTime.now().toIso8601String(),
          },
        ],
      };

      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/payouts/summary') {
          return http.Response(jsonEncode(mockSummary), 200, headers: {'content-type': 'application/json'});
        }
        if (request.url.path == '/api/payouts/history') {
          return http.Response(jsonEncode(mockSummary['recentPayouts']), 200, headers: {'content-type': 'application/json'});
        }
        if (request.url.path == '/api/payouts/bank-account') {
          return http.Response(jsonEncode(mockSummary['bankAccount']), 200, headers: {'content-type': 'application/json'});
        }
        if (request.url.path == '/api/payouts/request-withdrawal') {
          return http.Response(
            jsonEncode({
              'batchReference': 'WTH-20261005-TEST99',
              'amountRequested': 25000.0,
              'payoutsCount': 3,
              'status': 'Processing',
              'requestedAt': DateTime.now().toIso8601String(),
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
      final authRepo = AuthRepository(apiClient: apiClient, storage: storage);
      final invoiceRepo = InvoiceRepository(apiClient: apiClient);
      final paymentRepo = PaymentRepository(apiClient: apiClient);

      final authProvider = AuthProvider(authRepo: authRepo, storage: storage);
      final paymentProvider = PaymentProvider(invoiceRepo: invoiceRepo, paymentRepo: paymentRepo);

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<PaymentProvider>.value(value: paymentProvider),
          ],
          child: const MaterialApp(
            home: ProviderPayoutManagementScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Screen Header
      expect(find.text('Earnings & Payouts'), findsOneWidget);

      // Verify KPI Metrics
      expect(find.text('Rs. 85,000.00'), findsOneWidget);
      expect(find.text('Rs. 25,000.00'), findsOneWidget);
      expect(find.text('Rs. 12,000.00'), findsOneWidget);
      expect(find.text('15 Jobs'), findsOneWidget);

      // Verify Linked Bank Account Card
      expect(find.text('Commercial Bank of Ceylon'), findsOneWidget);
      expect(find.text('Ready for CEFT Direct Deposit'), findsOneWidget);
      expect(find.text('•••• 5678'), findsOneWidget);
      expect(find.text('Kollupitiya (042)'), findsOneWidget);
      expect(find.text('Samantha Silva'), findsOneWidget);

      // Verify Revenue Share Explainer
      expect(find.text('85% Net Provider Revenue Share'), findsOneWidget);

      // Verify Payout Activity Record (only Completed disbursements shown, not Pending)
      expect(find.text('Recent Completed Payouts'), findsOneWidget);
      expect(find.text('1 Record'), findsOneWidget);
      expect(find.text('PAY-001'), findsOneWidget);
      expect(find.text('+Rs. 8,500.00'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
      expect(find.text('PAY-PENDING-99'), findsNothing);

      // Open and verify Withdraw Bottom Sheet
      final withdrawBtn = find.widgetWithText(ElevatedButton, 'Withdraw');
      expect(withdrawBtn, findsOneWidget);
      await tester.tap(withdrawBtn);
      await tester.pumpAndSettle();

      expect(find.text('Request Payout Withdrawal'), findsOneWidget);
      expect(find.text('Confirm Withdrawal'), findsOneWidget);

      // Tap Confirm Withdrawal
      final confirmBtn = find.widgetWithText(ElevatedButton, 'Confirm Withdrawal');
      await tester.tap(confirmBtn);
      await tester.pumpAndSettle();

      // Verify Snackbar Confirmation
      expect(find.textContaining('WTH-20261005-TEST99'), findsOneWidget);
    });

    testWidgets('Shows warning banner when no bank account is linked and opens Link Sheet', (tester) async {
      final mockSummary = {
        'providerId': 'prov-001',
        'totalEarnings': 0.0,
        'availableBalance': 0.0,
        'pendingPayouts': 0.0,
        'completedJobsCount': 0,
        'bankAccount': null,
        'recentPayouts': [],
      };

      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/payouts/summary') {
          return http.Response(jsonEncode(mockSummary), 200, headers: {'content-type': 'application/json'});
        }
        if (request.url.path == '/api/payouts/history') {
          return http.Response(jsonEncode([]), 200, headers: {'content-type': 'application/json'});
        }
        if (request.url.path == '/api/payouts/bank-account') {
          return http.Response('null', 200, headers: {'content-type': 'application/json'});
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(storage: storage, httpClient: mockClient, baseUrl: 'http://test');
      final authRepo = AuthRepository(apiClient: apiClient, storage: storage);
      final invoiceRepo = InvoiceRepository(apiClient: apiClient);
      final paymentRepo = PaymentRepository(apiClient: apiClient);

      final authProvider = AuthProvider(authRepo: authRepo, storage: storage);
      final paymentProvider = PaymentProvider(invoiceRepo: invoiceRepo, paymentRepo: paymentRepo);

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
            ChangeNotifierProvider<PaymentProvider>.value(value: paymentProvider),
          ],
          child: const MaterialApp(
            home: ProviderPayoutManagementScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify No Bank Account Linked Banner
      expect(find.text('No Bank Account Linked'), findsOneWidget);
      expect(find.text('Link Bank Account Now'), findsOneWidget);
      expect(find.text('No Completed Payouts Yet'), findsOneWidget);

      // Tap Link Bank Account Now
      await tester.tap(find.text('Link Bank Account Now'));
      await tester.pumpAndSettle();

      expect(find.text('Link Sri Lankan Bank Account'), findsOneWidget);
      expect(find.text('Select Bank'), findsOneWidget);
      expect(find.text('Account Number'), findsOneWidget);
    });
  });
}
