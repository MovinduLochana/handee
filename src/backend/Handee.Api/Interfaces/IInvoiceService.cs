using handee.API.DTO;

namespace handee.API.Interfaces;

public interface IInvoiceService
{
    Task<InvoiceResponseDto> CreateInvoiceAsync(CreateInvoiceDto dto, Guid requestingUserId);
    Task<InvoiceResponseDto?> GetInvoiceByIdAsync(Guid id);
    Task<InvoiceResponseDto?> GetInvoiceByBookingIdAsync(Guid bookingId);
    Task<List<InvoiceResponseDto>> GetCustomerInvoicesAsync(Guid customerId);
    Task<List<InvoiceResponseDto>> GetProviderInvoicesAsync(Guid providerId);
    Task<List<InvoiceResponseDto>> GetAllInvoicesAsync();
    Task<InvoiceResponseDto?> UpdateInvoiceStatusAsync(Guid id, UpdateInvoiceStatusDto dto);
}
