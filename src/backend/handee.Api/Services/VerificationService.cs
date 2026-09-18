using handee.API.Data;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Identity;
using System.Diagnostics;

namespace handee.API.Services;

/// <summary>
/// Enforces the provider verification state machine.
/// All legal transitions must pass through this service — no direct DB updates elsewhere.
/// </summary>
public class VerificationService(
    IProviderProfileRepository profileRepo,
    AppDbContext db,
    UserManager<ApplicationUser> userManager,
    ILogger<VerificationService> logger)
{
    private static readonly ActivitySource Activity = new("handee.ProviderVerification");

    private static readonly HashSet<(VerificationStatus From, VerificationStatus To)> LegalAdminTransitions =
    [
        (VerificationStatus.Pending,  VerificationStatus.InReview),
        (VerificationStatus.Pending,  VerificationStatus.Verified),
        (VerificationStatus.Pending,  VerificationStatus.Rejected),
        (VerificationStatus.InReview, VerificationStatus.Verified),
        (VerificationStatus.InReview, VerificationStatus.Rejected),
    ];

    /// <summary>
    /// Admin-driven status transition. Writes an audit log row and syncs ApplicationUser cache.
    /// </summary>
    public async Task TransitionAsync(
        Guid profileId,
        Guid adminUserId,
        VerificationStatus newStatus,
        string? note,
        CancellationToken ct = default)
    {
        using var span = Activity.StartActivity("VerificationService.Transition");

        var profile = await profileRepo.GetByIdAsync(profileId, ct)
            ?? throw new KeyNotFoundException($"ProviderProfile {profileId} not found.");

        var transition = (profile.VerificationStatus, newStatus);

        if (!LegalAdminTransitions.Contains(transition))
            throw new InvalidOperationException(
                $"Transition from {profile.VerificationStatus} to {newStatus} is not permitted. " +
                "A rejected provider must resubmit documents before moving back to review.");

        span?.SetTag("from", profile.VerificationStatus.ToString());
        span?.SetTag("to", newStatus.ToString());

        var log = new VerificationAuditLog
        {
            Id = Guid.NewGuid(),
            ProviderProfileId = profileId,
            AdminUserId = adminUserId,
            PreviousStatus = profile.VerificationStatus,
            NewStatus = newStatus,
            Timestamp = DateTimeOffset.UtcNow,
            Note = note
        };

        profile.VerificationStatus = newStatus;
        await db.VerificationAuditLogs.AddAsync(log, ct);
        await db.SaveChangesAsync(ct);   // persists both the status update (tracked) and the audit log

        // Sync denormalized cache on ApplicationUser
        var user = await userManager.FindByIdAsync(profile.UserId.ToString());
        if (user is not null)
        {
            user.ProviderVerificationStatus = newStatus switch
            {
                VerificationStatus.Verified => ProviderVerificationStatus.Verified,
                VerificationStatus.Rejected => ProviderVerificationStatus.Rejected,
                VerificationStatus.InReview => ProviderVerificationStatus.Pending,  // closest match
                _ => ProviderVerificationStatus.Pending
            };
            await userManager.UpdateAsync(user);
        }

        logger.LogInformation(
            "Verification: profile={ProfileId} {From}→{To} by admin={AdminId}",
            profileId, log.PreviousStatus, newStatus, adminUserId);
    }

    /// <summary>
    /// Called when a rejected provider resubmits a document.
    /// The only legal path from Rejected → Pending.
    /// </summary>
    public async Task ResubmitAsync(Guid profileId, CancellationToken ct = default)
    {
        var profile = await profileRepo.GetByIdAsync(profileId, ct)
            ?? throw new KeyNotFoundException($"ProviderProfile {profileId} not found.");

        if (profile.VerificationStatus != VerificationStatus.Rejected)
            throw new InvalidOperationException(
                $"Resubmit is only valid from Rejected status. Current status: {profile.VerificationStatus}");

        profile.VerificationStatus = VerificationStatus.Pending;
        await profileRepo.SaveChangesAsync(ct);

        logger.LogInformation("Verification resubmit: profile={ProfileId} Rejected→Pending", profileId);
    }
}
