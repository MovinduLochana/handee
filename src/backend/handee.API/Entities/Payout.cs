namespace handee.API.Entities;

public enum PayoutStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}

public class Payout
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderId { get; set; }
    public Guid? BookingId { get; set; }

    public decimal GrossAmount { get; set; }
    public decimal PlatformFeeDeducted { get; set; }
    public decimal NetAmount { get; set; }
    public string Currency { get; set; } = "LKR";

    public PayoutStatus Status { get; set; } = PayoutStatus.Pending;
    public string? PayoutBatchId { get; set; }
    public DateTimeOffset? DisbursedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ApplicationUser Provider { get; set; } = default!;
    public Booking? Booking { get; set; }
}
