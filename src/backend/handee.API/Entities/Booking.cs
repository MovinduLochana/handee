namespace handee.API.Entities;

public enum BookingStatus
{
    Requested,
    Accepted,
    InProgress,
    Completed,
    Disputed
}

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? JobRequestId { get; set; }

    // ServiceListing doesn't exist yet as an entity. Nullable so this schema
    // doesn't need to change once it's added, and so a JobRequest-originated
    // booking (which has no listing) stays valid.
    public Guid? ServiceListingId { get; set; }

    /// <summary>
    /// Temporary FK straight to ApplicationUser.Id. There is no
    /// ProviderProfile entity yet — once one exists, this should likely
    /// become (or also reference) ProviderProfile, since a provider's
    /// bookable identity is a ProviderProfile, not the bare user account.
    /// </summary>
    public Guid ProviderId { get; set; }

    // Direct FK, not inferred through JobRequestId: JobRequestId is nullable
    // (a future ServiceListing-path booking has no JobRequest), but a
    // ServiceListing belongs to the provider, not the customer, so the
    // customer must always be identifiable independent of that path.
    public Guid CustomerId { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.Requested;

    // Nullable: a booking can exist before a time is confirmed (e.g. still
    // Requested, awaiting provider acceptance).
    public DateTimeOffset? ScheduledAt { get; set; }

    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    // Navigation properties
    public JobRequest? JobRequest { get; set; }
    public ServiceListing? ServiceListing { get; set; }
    public ApplicationUser Provider { get; set; } = default!;
    public ApplicationUser Customer { get; set; } = default!;
}
