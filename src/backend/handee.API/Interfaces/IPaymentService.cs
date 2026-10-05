using handee.API.DTO;

namespace handee.API.Interfaces;

public interface IPaymentService
{
    Task<PaymentResponseDto> ProcessPaymentAsync(ProcessPaymentRequestDto dto, Guid customerId);
    Task<PaymentResponseDto?> GetPaymentByIdAsync(Guid id);
    Task<PaymentResponseDto?> GetPaymentByInvoiceIdAsync(Guid invoiceId);
    Task<List<PaymentResponseDto>> GetCustomerPaymentsAsync(Guid customerId);
    Task<List<PaymentResponseDto>> GetAllPaymentsAsync();
    Task<ProviderEarningsSummaryDto> GetProviderEarningsSummaryAsync(Guid providerId);
    Task<List<PayoutResponseDto>> GetProviderPayoutsAsync(Guid providerId);
    Task<AdminPayoutsOverviewDto> GetAdminPayoutsOverviewAsync();
    Task<PayoutResponseDto?> ProcessPayoutAsync(Guid payoutId);
    Task<PayHereCheckoutParamsDto> GetPayHereParamsAsync(Guid invoiceId, Guid? customerId = null);
    Task<PaymentResponseDto> ConfirmPayHerePaymentAsync(Guid invoiceId, string? paymentId, decimal? amount, string? currency, string? cardNo, string? method);
    Task<bool> ResetInvoiceForTestingAsync(Guid invoiceId);
}

