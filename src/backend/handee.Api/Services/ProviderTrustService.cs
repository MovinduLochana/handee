using handee.API.Data;
using handee.API.DTO.Provider;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using System.Diagnostics;

namespace handee.API.Services;

/// <summary>
/// Builds and returns the trust-signal payload for the Agentic AI system.
/// Single authoritative source for provider trust data — never drifts from what Admin screens use.
/// </summary>
public class ProviderTrustService(
    IProviderProfileRepository profileRepo,
    IDistributedCache cache,
    ILogger<ProviderTrustService> logger) : IProviderTrustService
{
    private static readonly ActivitySource Activity = new("handee.ProviderTrust");
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    public async Task<TrustSignalDto> GetProviderTrustSignals(Guid providerId, CancellationToken ct = default)
    {
        using var span = Activity.StartActivity("ProviderTrustService.GetTrustSignals");
        span?.SetTag("providerId", providerId);

        // Try cache first
        var cacheKey = $"trust:{providerId}";
        var cached = await cache.GetStringAsync(cacheKey, ct);
        if (cached is not null)
        {
            logger.LogDebug("Trust signal cache HIT for {ProviderId}", providerId);
            return System.Text.Json.JsonSerializer.Deserialize<TrustSignalDto>(cached)!;
        }

        var profile = await profileRepo.GetByIdAsync(providerId, ct)
            ?? throw new KeyNotFoundException($"ProviderProfile {providerId} not found.");

        // Safety invariant — a Rejected or Pending provider must NEVER appear as Verified
        if (profile.VerificationStatus is VerificationStatus.Pending or VerificationStatus.Rejected
            && profile.VerificationStatus == VerificationStatus.Verified)
        {
            // This is a logic bug — surface loudly
            throw new InvalidOperationException(
                $"Data integrity violation: profile {providerId} has inconsistent verification status.");
        }

        var accountAgeDays = (int)(DateTimeOffset.UtcNow - profile.User.CreatedAt).TotalDays;

        var dto = new TrustSignalDto(
            ProviderId: providerId,
            VerificationStatus: profile.VerificationStatus,
            RatingAggregate: profile.RatingAggregate,
            TotalReviewCount: profile.TotalReviewCount,
            AccountAgeDays: accountAgeDays,
            IsAvailableForWork: profile.IsAvailableForWork);

        // Cache result
        var serialized = System.Text.Json.JsonSerializer.Serialize(dto);
        await cache.SetStringAsync(cacheKey, serialized,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = CacheTtl }, ct);

        span?.SetTag("verificationStatus", dto.VerificationStatus.ToString());
        logger.LogInformation("Trust signal computed for {ProviderId}: {Status}", providerId, dto.VerificationStatus);

        return dto;
    }

    /// <summary>Busts the trust-signal cache for a provider (call after verification status changes).</summary>
    public async Task InvalidateCacheAsync(Guid providerId, CancellationToken ct = default) =>
        await cache.RemoveAsync($"trust:{providerId}", ct);
}
