namespace handee.API.DTO;

public record ProcessPaymentRequestDto(
    Guid InvoiceId,
    string PaymentMethodType = "card",
    string? CardToken = "tok_visa_sandbox",
    string? CardLast4 = "4242",
    string GatewayProvider = "Stripe"
);

public record PaymentResponseDto(
    Guid Id,
    Guid InvoiceId,
    Guid BookingId,
    decimal Amount,
    string Currency,
    string GatewayProvider,
    string TransactionReference,
    string Status,
    string? CardLast4,
    string? FailureReason,
    DateTimeOffset CreatedAt,
    DateTimeOffset? SettledAt
);
