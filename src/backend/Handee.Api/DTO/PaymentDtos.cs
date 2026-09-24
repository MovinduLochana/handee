namespace handee.API.DTO;

public record ProcessPaymentRequestDto(
    Guid InvoiceId,
    string? PaymentMethodType = "card",
    string? PaymentMethod = null,
    string? CardToken = "tok_visa_sandbox",
    string? PaymentToken = null,
    string? CardLast4 = "4242",
    string? Last4 = null,
    string? GatewayProvider = "Stripe"
)
{
    public string EffectivePaymentMethod => !string.IsNullOrWhiteSpace(PaymentMethod) ? PaymentMethod : PaymentMethodType ?? "card";
    public string EffectiveCardToken => !string.IsNullOrWhiteSpace(PaymentToken) ? PaymentToken : CardToken ?? "tok_visa_sandbox";
    public string EffectiveLast4 => !string.IsNullOrWhiteSpace(Last4) ? Last4 : CardLast4 ?? "4242";
    public string EffectiveGateway => !string.IsNullOrWhiteSpace(GatewayProvider) ? GatewayProvider : "Stripe";
}

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
)
{
    public DateTimeOffset? PaidAt => SettledAt ?? CreatedAt;
    public string PaymentMethod => "card";
}

