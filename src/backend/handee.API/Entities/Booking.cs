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

    public BookingStatus Status { get; set; } = BookingStatus.Requested;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    // Navigation properties
    public JobRequest? JobRequest { get; set; }
    public ApplicationUser Provider { get; set; } = default!;
}
