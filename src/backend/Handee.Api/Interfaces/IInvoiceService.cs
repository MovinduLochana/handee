using handee.API.DTO;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IInvoiceService
{
    Task<InvoiceResponseDto> CreateInvoiceAsync(CreateInvoiceDto dto, Guid requestingUserId);
    Task<InvoiceResponseDto> CreateInvoiceForBookingAsync(
        Guid bookingId,
        Guid customerId,
        Guid providerId,
        decimal estimatedPrice,
        QuoteApprovalStatus approvalStatus,
        string? category = null,
        CancellationToken ct = default);
    Task<InvoiceResponseDto?> GetInvoiceByIdAsync(Guid id);
    Task<InvoiceResponseDto?> GetInvoiceByBookingIdAsync(Guid bookingId);
    Task<List<InvoiceResponseDto>> GetCustomerInvoicesAsync(Guid customerId);
    Task<List<InvoiceResponseDto>> GetProviderInvoicesAsync(Guid providerId);
    Task<List<InvoiceResponseDto>> GetAllInvoicesAsync();
    Task<InvoiceResponseDto?> UpdateInvoiceStatusAsync(Guid id, UpdateInvoiceStatusDto dto);
}

