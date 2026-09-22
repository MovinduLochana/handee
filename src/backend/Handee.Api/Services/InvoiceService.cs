using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Services;

public class InvoiceService : IInvoiceService
{
    private readonly AppDbContext _context;

    public InvoiceService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<InvoiceResponseDto> CreateInvoiceAsync(CreateInvoiceDto dto, Guid requestingUserId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Provider)
            .FirstOrDefaultAsync(b => b.Id == dto.BookingId);

        if (booking == null)
            throw new KeyNotFoundException($"Booking {dto.BookingId} was not found.");

        if (booking.ProviderId != requestingUserId && booking.CustomerId != requestingUserId)
            throw new UnauthorizedAccessException("Only the assigned provider or booking customer can generate an invoice.");

        var existingInvoice = await _context.Invoices.FirstOrDefaultAsync(i => i.BookingId == dto.BookingId);
        if (existingInvoice != null)
            return MapToDto(existingInvoice, booking.Customer.FullName, booking.Provider.FullName);

        var baseAmount = dto.BaseAmount;
        var platformFee = Math.Round(baseAmount * 0.15m, 2);
        var totalAmount = baseAmount + platformFee;

        var invoice = new Invoice
        {
            BookingId = dto.BookingId,
            CustomerId = booking.CustomerId,
            ProviderId = booking.ProviderId,
            BaseAmount = baseAmount,
            PlatformFee = platformFee,
            TotalAmount = totalAmount,
            Currency = "LKR",
            Status = InvoiceStatus.Issued,
            AdminApprovalStatus = QuoteApprovalStatus.AutoApproved,
            LineItemsJson = dto.LineItemsJson,
            DueAt = DateTimeOffset.UtcNow.AddDays(3),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        return MapToDto(invoice, booking.Customer?.FullName, booking.Provider?.FullName);
    }

    public async Task<InvoiceResponseDto?> GetInvoiceByIdAsync(Guid id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .FirstOrDefaultAsync(i => i.Id == id);

        return invoice == null ? null : MapToDto(invoice, invoice.Customer?.FullName, invoice.Provider?.FullName);
    }

    public async Task<InvoiceResponseDto?> GetInvoiceByBookingIdAsync(Guid bookingId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .FirstOrDefaultAsync(i => i.BookingId == bookingId);

        return invoice == null ? null : MapToDto(invoice, invoice.Customer?.FullName, invoice.Provider?.FullName);
    }

    public async Task<List<InvoiceResponseDto>> GetCustomerInvoicesAsync(Guid customerId)
    {
        return await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .Where(i => i.CustomerId == customerId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => MapToDto(i, i.Customer.FullName, i.Provider.FullName))
            .ToListAsync();
    }

    public async Task<List<InvoiceResponseDto>> GetProviderInvoicesAsync(Guid providerId)
    {
        return await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .Where(i => i.ProviderId == providerId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => MapToDto(i, i.Customer.FullName, i.Provider.FullName))
            .ToListAsync();
    }

    public async Task<List<InvoiceResponseDto>> GetAllInvoicesAsync()
    {
        return await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => MapToDto(i, i.Customer.FullName, i.Provider.FullName))
            .ToListAsync();
    }

    public async Task<InvoiceResponseDto?> UpdateInvoiceStatusAsync(Guid id, UpdateInvoiceStatusDto dto)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice == null)
            return null;

        if (Enum.TryParse<InvoiceStatus>(dto.Status, true, out var parsedStatus))
        {
            invoice.Status = parsedStatus;
            invoice.UpdatedAt = DateTimeOffset.UtcNow;
            if (parsedStatus == InvoiceStatus.Paid && invoice.PaidAt == null)
            {
                invoice.PaidAt = DateTimeOffset.UtcNow;
            }
            await _context.SaveChangesAsync();
        }

        return MapToDto(invoice, invoice.Customer?.FullName, invoice.Provider?.FullName);
    }

    private static InvoiceResponseDto MapToDto(Invoice i, string? customerName, string? providerName)
    {
        return new InvoiceResponseDto(
            i.Id,
            i.BookingId,
            i.CustomerId,
            customerName,
            i.ProviderId,
            providerName,
            i.BaseAmount,
            i.PlatformFee,
            i.TotalAmount,
            i.Currency,
            i.Status.ToString(),
            i.AdminApprovalStatus.ToString(),
            i.LineItemsJson,
            i.DueAt,
            i.PaidAt,
            i.CreatedAt
        );
    }
}
