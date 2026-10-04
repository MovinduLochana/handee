using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Services;

public class InvoiceService : IInvoiceService
{
    private readonly AppDbContext _context;
    private readonly IPricingConfigService? _pricingConfigService;

    public InvoiceService(AppDbContext context) : this(context, null)
    {
    }

    public InvoiceService(AppDbContext context, IPricingConfigService? pricingConfigService)
    {
        _context = context;
        _pricingConfigService = pricingConfigService;
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

    public Task<InvoiceResponseDto> CreateInvoiceForBookingAsync(
        Guid bookingId,
        Guid customerId,
        Guid providerId,
        decimal estimatedPrice,
        QuoteApprovalStatus approvalStatus,
        string? category = null,
        CancellationToken ct = default)
    {
        return CreateInvoiceForBookingAsync(bookingId, customerId, providerId, estimatedPrice, approvalStatus, category, null, null, ct);
    }

    public async Task<InvoiceResponseDto> CreateInvoiceForBookingAsync(
        Guid bookingId,
        Guid customerId,
        Guid providerId,
        decimal estimatedPrice,
        QuoteApprovalStatus approvalStatus,
        string? category,
        decimal? urgencyMultiplier,
        string? urgencyLevel = null,
        CancellationToken ct = default)
    {
        var existingInvoice = await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .FirstOrDefaultAsync(i => i.BookingId == bookingId, ct);

        // If urgency not explicitly passed, inspect the booking's JobRequest
        if ((!urgencyMultiplier.HasValue || urgencyMultiplier.Value <= 0) && bookingId != Guid.Empty)
        {
            var booking = await _context.Bookings
                .Include(b => b.JobRequest)
                .FirstOrDefaultAsync(b => b.Id == bookingId, ct);

            if (booking?.JobRequest != null)
            {
                urgencyLevel ??= booking.JobRequest.Urgency.ToString();
                if (_pricingConfigService != null)
                {
                    var config = await _pricingConfigService.GetUrgencyMultipliersAsync(ct);
                    urgencyMultiplier = (decimal)_pricingConfigService.GetMultiplierForUrgency(booking.JobRequest.Urgency, config);
                }
                else
                {
                    // Fallback to dynamic SystemSettings from Admin Dashboard
                    var setting = await _context.SystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "Pricing:UrgencyMultipliers", ct);
                    if (setting != null && !string.IsNullOrWhiteSpace(setting.ValueJson))
                    {
                        try
                        {
                            var parsed = System.Text.Json.JsonSerializer.Deserialize<UrgencyMultiplierConfigDto>(setting.ValueJson);
                            if (parsed != null)
                            {
                                urgencyMultiplier = booking.JobRequest.Urgency switch
                                {
                                    JobUrgency.Low => (decimal)parsed.Low,
                                    JobUrgency.Medium => (decimal)parsed.Medium,
                                    JobUrgency.High => (decimal)parsed.High,
                                    JobUrgency.Emergency => (decimal)parsed.Emergency,
                                    _ => (decimal)parsed.Normal
                                };
                            }
                        }
                        catch { }
                    }

                    // Built-in defaults if database setting not yet seeded
                    urgencyMultiplier ??= booking.JobRequest.Urgency switch
                    {
                        JobUrgency.Low => 0.95m,
                        JobUrgency.Medium => 1.05m,
                        JobUrgency.High => 1.20m,
                        JobUrgency.Emergency => 1.40m,
                        _ => 1.0m
                    };
                }
            }
        }

        var finalPrice = estimatedPrice > 0 ? estimatedPrice : 3500m;
        var baseAmount = Math.Round(finalPrice * 0.85m, 2);
        var platformFee = Math.Round(finalPrice - baseAmount, 2);
        var totalAmount = finalPrice;

        var categoryLabel = string.IsNullOrWhiteSpace(category) ? "Service Work" : category;
        var mult = urgencyMultiplier ?? 1.0m;

        var lineItemList = new List<object>();
        if (mult != 1.0m && mult > 0)
        {
            var standardTotal = Math.Round(finalPrice / mult, 2);
            var baseLabor = Math.Round(standardTotal * 0.85m, 2);
            var urgencySurcharge = Math.Round(baseAmount - baseLabor, 2);
            var urgencyName = string.IsNullOrWhiteSpace(urgencyLevel) ? "Urgency" : urgencyLevel;

            lineItemList.Add(new { item = $"{categoryLabel} - Standard Service Labor", price = baseLabor, type = "Labor" });
            lineItemList.Add(new { item = $"Priority Dispatch Surcharge ({urgencyName} {mult:0.##}x)", price = urgencySurcharge, type = "Urgency" });
            lineItemList.Add(new { item = "Platform Trust & Verification Fee (15%)", price = platformFee, type = "Fee" });
        }
        else
        {
            lineItemList.Add(new { item = $"{categoryLabel} - Labor and Trade Service", price = baseAmount, type = "Labor" });
            lineItemList.Add(new { item = "Platform Trust & Verification Fee (15%)", price = platformFee, type = "Fee" });
        }

        var lineItemsJson = System.Text.Json.JsonSerializer.Serialize(lineItemList, new System.Text.Json.JsonSerializerOptions
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });

        if (existingInvoice != null)
        {
            if (existingInvoice.Status == InvoiceStatus.Issued &&
                (existingInvoice.TotalAmount != totalAmount || existingInvoice.LineItemsJson != lineItemsJson))
            {
                existingInvoice.BaseAmount = baseAmount;
                existingInvoice.PlatformFee = platformFee;
                existingInvoice.TotalAmount = totalAmount;
                existingInvoice.LineItemsJson = lineItemsJson;
                existingInvoice.AdminApprovalStatus = approvalStatus;
                await _context.SaveChangesAsync(ct);
            }
            return MapToDto(existingInvoice, existingInvoice.Customer?.FullName, existingInvoice.Provider?.FullName);
        }

        var invoice = new Invoice
        {
            BookingId = bookingId,
            CustomerId = customerId,
            ProviderId = providerId,
            BaseAmount = baseAmount,
            PlatformFee = platformFee,
            TotalAmount = totalAmount,
            Currency = "LKR",
            Status = InvoiceStatus.Issued,
            AdminApprovalStatus = approvalStatus,
            LineItemsJson = lineItemsJson,
            DueAt = DateTimeOffset.UtcNow.AddDays(3),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync(ct);

        var customer = await _context.Users.FindAsync([customerId], ct);
        var provider = await _context.Users.FindAsync([providerId], ct);

        return MapToDto(invoice, customer?.FullName, provider?.FullName);
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
        var invoices = await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .Where(i => i.CustomerId == customerId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invoices.Select(i => MapToDto(i, i.Customer?.FullName, i.Provider?.FullName)).ToList();
    }

    public async Task<List<InvoiceResponseDto>> GetProviderInvoicesAsync(Guid providerId)
    {
        var invoices = await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .Where(i => i.ProviderId == providerId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invoices.Select(i => MapToDto(i, i.Customer?.FullName, i.Provider?.FullName)).ToList();
    }

    public async Task<List<InvoiceResponseDto>> GetAllInvoicesAsync()
    {
        var invoices = await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Provider)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invoices.Select(i => MapToDto(i, i.Customer?.FullName, i.Provider?.FullName)).ToList();
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
        decimal urgencySurcharge = 0;
        if (!string.IsNullOrWhiteSpace(i.LineItemsJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(i.LineItemsJson);
                if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var el in doc.RootElement.EnumerateArray())
                    {
                        if (el.TryGetProperty("type", out var typeProp) &&
                            typeProp.GetString()?.Equals("Urgency", StringComparison.OrdinalIgnoreCase) == true)
                        {
                            if (el.TryGetProperty("price", out var priceProp))
                            {
                                urgencySurcharge = priceProp.GetDecimal();
                            }
                        }
                    }
                }
            }
            catch { }
        }

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
            i.CreatedAt,
            urgencySurcharge
        );
    }
}
