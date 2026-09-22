namespace handee.API.Entities;

public class ProviderAvailabilitySlot
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Direct FK to ApplicationUser.Id, matching Booking.ProviderId's
    /// existing pattern. A real ProviderProfile entity now exists (added by
    /// the provider-verification work merged separately), but
    /// Booking.ProviderId still points directly at ApplicationUser rather
    /// than ProviderProfile — nothing in the codebase has adopted
    /// ProviderProfile for this purpose yet. This stays consistent with
    /// Booking rather than being the only place that changes; switching both
    /// to ProviderProfile.Id is a separate, cross-cutting change that would
    /// also touch BookingService's existing authorization checks.
    /// </summary>
    public Guid ProviderId { get; set; }

    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }

    /// <summary>
    /// Not set automatically by anything yet — there is no CreateBooking
    /// endpoint (deliberately out of scope, from earlier work) to trigger
    /// it. Settable only as a direct field for now.
    /// </summary>
    public bool IsBooked { get; set; } = false;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    // Navigation property
    public ApplicationUser Provider { get; set; } = default!;
}
