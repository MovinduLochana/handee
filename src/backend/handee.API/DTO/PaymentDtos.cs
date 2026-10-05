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

public record PayHereCheckoutParamsDto(
    bool Sandbox,
    string MerchantId,
    string OrderId,
    string Items,
    decimal Amount,
    string AmountFormatted,
    string Currency,
    string Hash,
    string? FirstName,
    string? LastName,
    string? Email,
    string? Phone,
    string? Address,
    string? City,
    string Country,
    string ReturnUrl,
    string CancelUrl,
    string NotifyUrl,
    string CheckoutUrl
);

public record PayHereNotificationDto(
    string? merchant_id,
    string? order_id,
    string? payment_id,
    string? payhere_amount,
    string? payhere_currency,
    string? status_code,
    string? md5sig,
    string? custom_1,
    string? custom_2,
    string? status_message,
    string? method,
    string? card_holder_name,
    string? card_no,
    string? card_expiry
);

public record PayHereConfirmRequestDto(
    Guid InvoiceId,
    string? PaymentId = null,
    string? OrderId = null,
    decimal? Amount = null,
    string? Currency = null,
    string? CardLast4 = null,
    string? Method = null
);

