namespace handee.API.DTO;

public record InvoiceResponseDto(
    Guid Id,
    Guid BookingId,
    Guid CustomerId,
    string? CustomerName,
    Guid ProviderId,
    string? ProviderName,
    decimal BaseAmount,
    decimal PlatformFee,
    decimal TotalAmount,
    string Currency,
    string Status,
    string AdminApprovalStatus,
    string? LineItemsJson,
    DateTimeOffset? DueAt,
    DateTimeOffset? PaidAt,
    DateTimeOffset CreatedAt
);

public record CreateInvoiceDto(
    Guid BookingId,
    decimal BaseAmount,
    string? LineItemsJson = null
);

public record UpdateInvoiceStatusDto(
    string Status
);

public record QuoteBreakdownDto(
    decimal LaborAmount,
    decimal PlatformFee,
    decimal TotalAmount,
    string Currency = "LKR"
);
