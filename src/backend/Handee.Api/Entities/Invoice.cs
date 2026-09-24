namespace handee.API.Entities;

public enum InvoiceStatus
{
    Draft,
    Issued,
    Paid,
    Failed,
    Refunded,
    Disputed
}

public enum QuoteApprovalStatus
{
    AutoApproved,
    ApprovedWithAudit,
    PendingApproval,
    Approved,
    Rejected
}

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookingId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid ProviderId { get; set; }

    public decimal BaseAmount { get; set; }
    public decimal PlatformFee { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "LKR";

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Issued;
    public QuoteApprovalStatus AdminApprovalStatus { get; set; } = QuoteApprovalStatus.AutoApproved;

    public string? LineItemsJson { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public Booking Booking { get; set; } = default!;
    public ApplicationUser Customer { get; set; } = default!;
    public ApplicationUser Provider { get; set; } = default!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
