using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;
using Polly;
using Polly.Retry;

namespace handee.API.Services;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _context;
    private readonly AsyncRetryPolicy _gatewayRetryPolicy;

    public PaymentService(AppDbContext context)
    {
        _context = context;
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
            GatewayProvider = string.IsNullOrWhiteSpace(dto.GatewayProvider) ? "Stripe" : dto.GatewayProvider,
            TransactionReference = txnRef,
            Status = PaymentStatus.Succeeded,
            PaymentMethodType = dto.PaymentMethodType,
            CardLast4 = dto.CardLast4 ?? "4242",
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

    public async Task<List<PayoutResponseDto>> GetProviderPayoutsAsync(Guid providerId)
    {
        return await _context.Payouts
            .Include(p => p.Provider)
            .Where(p => p.ProviderId == providerId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PayoutResponseDto(
                p.Id,
                p.ProviderId,
                p.Provider.FullName,
                p.BookingId,
                p.GrossAmount,
                p.PlatformFeeDeducted,
                p.NetAmount,
                p.Currency,
                p.Status.ToString(),
                p.PayoutBatchId,
                p.DisbursedAt,
                p.CreatedAt
            ))
            .ToListAsync();
    }
}
