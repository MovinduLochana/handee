using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Services;

public class PricingConfigService : IPricingConfigService
{
    private const string SettingKey = "Pricing:UrgencyMultipliers";
    private readonly AppDbContext _db;
    private readonly ILogger<PricingConfigService> _logger;

    private static readonly UrgencyMultiplierConfigDto DefaultConfig = new(
        Low: 0.95,
        Normal: 1.00,
        Medium: 1.05,
        High: 1.20,
        Emergency: 1.40,
        LastUpdatedAt: null
    );

    // cached copy
    private static UrgencyMultiplierConfigDto? _cachedConfig;
    private static readonly object _cacheLock = new();

    public PricingConfigService(AppDbContext db, ILogger<PricingConfigService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<UrgencyMultiplierConfigDto> GetUrgencyMultipliersAsync(CancellationToken ct = default)
    {
        lock (_cacheLock)
        {
            if (_cachedConfig != null)
                return _cachedConfig;
        }

        try
        {
            var setting = await _db.SystemSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == SettingKey, ct);

            if (setting != null && !string.IsNullOrWhiteSpace(setting.ValueJson))
            {
                var parsed = JsonSerializer.Deserialize<UrgencyMultiplierConfigDto>(setting.ValueJson);
                if (parsed != null)
                {
                    var result = parsed with { LastUpdatedAt = setting.UpdatedAt };
                    lock (_cacheLock)
                    {
                        _cachedConfig = result;
                    }
                    return result;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load urgency multipliers from database. Falling back to platform defaults.");
        }

        return DefaultConfig;
    }

    public async Task<UrgencyMultiplierConfigDto> UpdateUrgencyMultipliersAsync(
        UrgencyMultiplierConfigDto dto,
        CancellationToken ct = default)
    {
        // Low <= Normal <= Medium <= High <= Emergency
        if (dto.Low > dto.Normal || dto.Normal > dto.Medium || dto.Medium > dto.High || dto.High > dto.Emergency)
        {
            throw new ValidationException(
                "Urgency multipliers must be monotonically ordered: Low <= Normal <= Medium <= High <= Emergency.");
        }

        var json = JsonSerializer.Serialize(dto);
        var now = DateTimeOffset.UtcNow;

        var existing = await _db.SystemSettings.FirstOrDefaultAsync(s => s.Key == SettingKey, ct);
        if (existing == null)
        {
            existing = new SystemSetting
            {
                Key = SettingKey,
                ValueJson = json,
                Description = "Dynamic urgency pricing multipliers for job requests and agent quotes.",
                UpdatedAt = now
            };
            _db.SystemSettings.Add(existing);
        }
        else
        {
            existing.ValueJson = json;
            existing.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(ct);

        var updated = dto with { LastUpdatedAt = now };
        lock (_cacheLock)
        {
            _cachedConfig = updated;
        }

        _logger.LogInformation("Urgency multipliers updated: Low={Low}, Normal={Normal}, Med={Med}, High={High}, Emergency={Emergency}",
            dto.Low, dto.Normal, dto.Medium, dto.High, dto.Emergency);

        return updated;
    }

    public double GetMultiplierForUrgency(JobUrgency urgency, UrgencyMultiplierConfigDto config) => urgency switch
    {
        JobUrgency.Low => config.Low,
        JobUrgency.Medium => config.Medium,
        JobUrgency.High => config.High,
        JobUrgency.Emergency => config.Emergency,
        _ => config.Normal
    };
}
