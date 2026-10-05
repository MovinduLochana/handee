using System.Globalization;
using handee.API.Common;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Polly;
using Polly.Retry;

namespace handee.API.Services;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration? _configuration;
    private readonly AsyncRetryPolicy _gatewayRetryPolicy;

    public PaymentService(AppDbContext context) : this(context, null)
    {
    }

    public PaymentService(AppDbContext context, IConfiguration? configuration)
    {
        _context = context;
        _configuration = configuration;
        _gatewayRetryPolicy = Policy
            .Handle<HttpRequestException>()
            .Or<TimeoutException>()
            .WaitAndRetryAsync(3, attempt => TimeSpan.FromMilliseconds(200 * Math.Pow(2, attempt)));
    }

    public async Task<PaymentResponseDto> ProcessPaymentAsync(ProcessPaymentRequestDto dto, Guid customerId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Booking)
            .FirstOrDefaultAsync(i => i.Id == dto.InvoiceId);

        if (invoice == null)
            throw new KeyNotFoundException($"Invoice {dto.InvoiceId} was not found.");

        if (invoice.CustomerId != customerId)
            throw new UnauthorizedAccessException("You can only pay for your own invoices.");

        if (invoice.Status == InvoiceStatus.Paid)
            throw new InvalidOperationException("This invoice has already been paid.");

        // Execute payment against sandbox gateway wrapped in Polly retry
        var txnRef = await _gatewayRetryPolicy.ExecuteAsync(async () =>
        {
            await Task.Delay(50); // Simulate network latency
            return $"ch_sbx_{Guid.NewGuid():N}";
        });

        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            BookingId = invoice.BookingId,
            CustomerId = customerId,
            Amount = invoice.TotalAmount,
            Currency = invoice.Currency,
            GatewayProvider = string.IsNullOrWhiteSpace(dto.EffectiveGateway) ? "Stripe" : dto.EffectiveGateway,
            TransactionReference = txnRef,
            Status = PaymentStatus.Succeeded,
            PaymentMethodType = dto.EffectivePaymentMethod,
            CardLast4 = dto.EffectiveLast4,
            CreatedAt = DateTimeOffset.UtcNow,
            SettledAt = DateTimeOffset.UtcNow
        };

        invoice.Status = InvoiceStatus.Paid;
        invoice.PaidAt = DateTimeOffset.UtcNow;
        invoice.UpdatedAt = DateTimeOffset.UtcNow;

        // Credit provider payout ledger with net earnings after platform fee deduction
        var payout = new Payout
        {
            ProviderId = invoice.ProviderId,
            BookingId = invoice.BookingId,
            GrossAmount = invoice.TotalAmount,
            PlatformFeeDeducted = invoice.PlatformFee,
            NetAmount = invoice.BaseAmount,
            Currency = invoice.Currency,
            Status = PayoutStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Payments.Add(payment);
        _context.Payouts.Add(payout);
        await _context.SaveChangesAsync();

        return new PaymentResponseDto(
            payment.Id,
            payment.InvoiceId,
            payment.BookingId,
            payment.Amount,
            payment.Currency,
            payment.GatewayProvider,
            payment.TransactionReference,
            payment.Status.ToString(),
            payment.CardLast4,
            payment.FailureReason,
            payment.CreatedAt,
            payment.SettledAt
        );
    }

    public async Task<List<PaymentResponseDto>> GetCustomerPaymentsAsync(Guid customerId)
    {
        return await _context.Payments
            .Where(p => p.CustomerId == customerId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PaymentResponseDto(
                p.Id,
                p.InvoiceId,
                p.BookingId,
                p.Amount,
                p.Currency,
                p.GatewayProvider,
                p.TransactionReference,
                p.Status.ToString(),
                p.CardLast4,
                p.FailureReason,
                p.CreatedAt,
                p.SettledAt
            ))
            .ToListAsync();
    }

    public async Task<List<PaymentResponseDto>> GetAllPaymentsAsync()
    {
        return await _context.Payments
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PaymentResponseDto(
                p.Id,
                p.InvoiceId,
                p.BookingId,
                p.Amount,
                p.Currency,
                p.GatewayProvider,
                p.TransactionReference,
                p.Status.ToString(),
                p.CardLast4,
                p.FailureReason,
                p.CreatedAt,
                p.SettledAt
            ))
            .ToListAsync();
    }

    public async Task<ProviderEarningsSummaryDto> GetProviderEarningsSummaryAsync(Guid providerId)
    {
        var payouts = await _context.Payouts
            .Where(p => p.ProviderId == providerId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var totalEarnings = payouts.Where(p => p.Status == PayoutStatus.Completed).Sum(p => p.NetAmount);
        var availableBalance = payouts.Where(p => p.Status == PayoutStatus.Pending).Sum(p => p.NetAmount);
        var pendingPayouts = payouts.Where(p => p.Status == PayoutStatus.Processing).Sum(p => p.NetAmount);
        var completedJobsCount = payouts.Count;

        var recentPayoutDtos = payouts.Take(10).Select(p => new PayoutResponseDto(
            p.Id,
            p.ProviderId,
            null,
            p.BookingId,
            p.GrossAmount,
            p.PlatformFeeDeducted,
            p.NetAmount,
            p.Currency,
            p.Status.ToString(),
            p.PayoutBatchId,
            p.DisbursedAt,
            p.CreatedAt
        )).ToList();

        return new ProviderEarningsSummaryDto(
            providerId,
            totalEarnings,
            availableBalance,
            pendingPayouts,
            completedJobsCount,
            recentPayoutDtos
        );
    }

    public async Task<PaymentResponseDto?> GetPaymentByIdAsync(Guid id)
    {
        var payment = await _context.Payments.FirstOrDefaultAsync(p => p.Id == id);
        return payment == null ? null : MapPaymentToDto(payment);
    }

    public async Task<PaymentResponseDto?> GetPaymentByInvoiceIdAsync(Guid invoiceId)
    {
        var payment = await _context.Payments
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(p => p.InvoiceId == invoiceId);
        return payment == null ? null : MapPaymentToDto(payment);
    }

    public async Task<AdminPayoutsOverviewDto> GetAdminPayoutsOverviewAsync()
    {
        var payouts = await _context.Payouts
            .Include(p => p.Provider)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var totalGrossVolume = payouts.Sum(p => p.GrossAmount);
        var totalPlatformFees = payouts.Sum(p => p.PlatformFeeDeducted);
        var totalPaidOut = payouts.Where(p => p.Status == PayoutStatus.Completed).Sum(p => p.NetAmount);
        var pendingPayoutCount = payouts.Count(p => p.Status == PayoutStatus.Pending || p.Status == PayoutStatus.Processing);

        var recentPayoutDtos = payouts.Take(50).Select(MapPayoutToDto).ToList();

        return new AdminPayoutsOverviewDto(
            totalGrossVolume,
            totalPlatformFees,
            totalPaidOut,
            pendingPayoutCount,
            recentPayoutDtos
        );
    }

    public async Task<PayoutResponseDto?> ProcessPayoutAsync(Guid payoutId)
    {
        var payout = await _context.Payouts
            .Include(p => p.Provider)
            .FirstOrDefaultAsync(p => p.Id == payoutId);

        if (payout == null) return null;

        payout.Status = PayoutStatus.Completed;
        payout.DisbursedAt = DateTimeOffset.UtcNow;
        if (string.IsNullOrWhiteSpace(payout.PayoutBatchId))
        {
            payout.PayoutBatchId = $"disb_{Guid.NewGuid():N}";
        }

        await _context.SaveChangesAsync();
        return MapPayoutToDto(payout);
    }

    public async Task<List<PayoutResponseDto>> GetProviderPayoutsAsync(Guid providerId)
    {
        return await _context.Payouts
            .Include(p => p.Provider)
            .Where(p => p.ProviderId == providerId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => MapPayoutToDto(p))
            .ToListAsync();
    }

    public async Task<PayHereCheckoutParamsDto> GetPayHereParamsAsync(Guid invoiceId, Guid? customerId = null)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Booking)
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null)
            throw new KeyNotFoundException($"Invoice {invoiceId} was not found.");

        if (customerId.HasValue && invoice.CustomerId != customerId.Value)
            throw new UnauthorizedAccessException("You can only pay for your own invoices.");

        if (invoice.Status == InvoiceStatus.Paid)
            throw new InvalidOperationException("This invoice has already been paid.");

        var merchantId = _configuration?["PayHere:MerchantId"] ?? "1211149";
        var merchantSecret = _configuration?["PayHere:MerchantSecret"] ?? "4Tuxxxxxxxxxxxxxxxx";
        var isSandbox = bool.Parse(_configuration?["PayHere:IsSandbox"] ?? "true");
        var formattedAmount = invoice.TotalAmount.ToString("0.00", CultureInfo.InvariantCulture);

        var hash = PayHereSecurity.GenerateCheckoutHash(
            merchantId,
            invoice.Id.ToString(),
            invoice.TotalAmount,
            invoice.Currency,
            merchantSecret
        );

        var baseAppUrl = _configuration?["PayHere:BaseAppUrl"] ?? "http://localhost:5173";
        var apiBaseUrl = _configuration?["PayHere:ApiBaseUrl"] ?? "http://localhost:5057";

        var returnUrl = $"{baseAppUrl}/invoices/{invoice.Id}?status=success";
        var cancelUrl = $"{baseAppUrl}/invoices/{invoice.Id}/pay?status=cancelled";
        var notifyUrl = $"{apiBaseUrl}/api/payments/payhere-notify";

        var customerName = invoice.Customer?.FullName?.Trim() ?? "Handee Customer";
        var nameParts = customerName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var firstName = nameParts.Length > 0 ? nameParts[0] : "Customer";
        var lastName = nameParts.Length > 1 ? nameParts[1] : "User";
        var email = !string.IsNullOrWhiteSpace(invoice.Customer?.Email) ? invoice.Customer.Email : "customer@handee.lk";
        var phone = !string.IsNullOrWhiteSpace(invoice.Customer?.PhoneNumber) ? invoice.Customer.PhoneNumber : "0771234567";

        return new PayHereCheckoutParamsDto(
            Sandbox: isSandbox,
            MerchantId: merchantId,
            OrderId: invoice.Id.ToString(),
            Items: $"Handee Booking #{invoice.BookingId.ToString()[..8].ToUpperInvariant()}",
            Amount: invoice.TotalAmount,
            AmountFormatted: formattedAmount,
            Currency: invoice.Currency,
            Hash: hash,
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            Phone: phone,
            Address: "Colombo, Sri Lanka",
            City: "Colombo",
            Country: "Sri Lanka",
            ReturnUrl: returnUrl,
            CancelUrl: cancelUrl,
            NotifyUrl: notifyUrl,
            CheckoutUrl: isSandbox ? "https://sandbox.payhere.lk/pay/checkout" : "https://www.payhere.lk/pay/checkout"
        );
    }

    public async Task<PaymentResponseDto> ConfirmPayHerePaymentAsync(
        Guid invoiceId,
        string? paymentId,
        decimal? amount,
        string? currency,
        string? cardNo,
        string? method)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Booking)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null)
            throw new KeyNotFoundException($"Invoice {invoiceId} was not found.");

        if (invoice.Status == InvoiceStatus.Paid)
        {
            var existing = await _context.Payments
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync(p => p.InvoiceId == invoiceId);
            if (existing != null)
                return MapPaymentToDto(existing);
        }

        var effectivePaymentId = !string.IsNullOrWhiteSpace(paymentId)
            ? paymentId
            : $"ph_sbx_{Guid.NewGuid():N}";

        var last4 = "4242";
        if (!string.IsNullOrWhiteSpace(cardNo))
        {
            var cleanDigits = new string(cardNo.Where(char.IsDigit).ToArray());
            if (cleanDigits.Length >= 4)
            {
                last4 = cleanDigits[^4..];
            }
        }

        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            BookingId = invoice.BookingId,
            CustomerId = invoice.CustomerId,
            Amount = amount ?? invoice.TotalAmount,
            Currency = !string.IsNullOrWhiteSpace(currency) ? currency : invoice.Currency,
            GatewayProvider = "PayHere-Sandbox",
            TransactionReference = effectivePaymentId,
            Status = PaymentStatus.Succeeded,
            PaymentMethodType = !string.IsNullOrWhiteSpace(method) ? method : "card",
            CardLast4 = last4,
            CreatedAt = DateTimeOffset.UtcNow,
            SettledAt = DateTimeOffset.UtcNow
        };

        invoice.Status = InvoiceStatus.Paid;
        invoice.PaidAt = DateTimeOffset.UtcNow;
        invoice.UpdatedAt = DateTimeOffset.UtcNow;

        var payout = new Payout
        {
            ProviderId = invoice.ProviderId,
            BookingId = invoice.BookingId,
            GrossAmount = invoice.TotalAmount,
            PlatformFeeDeducted = invoice.PlatformFee,
            NetAmount = invoice.BaseAmount,
            Currency = invoice.Currency,
            Status = PayoutStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Payments.Add(payment);
        _context.Payouts.Add(payout);
        await _context.SaveChangesAsync();

        return MapPaymentToDto(payment);
    }

    private static PaymentResponseDto MapPaymentToDto(Payment p) =>
        new(
            p.Id,
            p.InvoiceId,
            p.BookingId,
            p.Amount,
            p.Currency,
            p.GatewayProvider,
            p.TransactionReference,
            p.Status.ToString(),
            p.CardLast4,
            p.FailureReason,
            p.CreatedAt,
            p.SettledAt
        );

    private static PayoutResponseDto MapPayoutToDto(Payout p) =>
        new(
            p.Id,
            p.ProviderId,
            p.Provider != null ? p.Provider.FullName : null,
            p.BookingId,
            p.GrossAmount,
            p.PlatformFeeDeducted,
            p.NetAmount,
            p.Currency,
            p.Status.ToString(),
            p.PayoutBatchId,
            p.DisbursedAt,
            p.CreatedAt
        );
}

