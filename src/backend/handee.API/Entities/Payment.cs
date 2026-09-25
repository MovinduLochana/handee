namespace handee.API.Entities;

public enum PaymentStatus
{
    Pending,
    Succeeded,
    Failed,
    Refunded
}

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Guid BookingId { get; set; }
    public Guid CustomerId { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public string GatewayProvider { get; set; } = "Stripe";
    public string TransactionReference { get; set; } = default!;

    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string PaymentMethodType { get; set; } = "card";
    public string? CardLast4 { get; set; }
    public string? FailureReason { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SettledAt { get; set; }

    public Invoice Invoice { get; set; } = default!;
    public Booking Booking { get; set; } = default!;
    public ApplicationUser Customer { get; set; } = default!;
}
