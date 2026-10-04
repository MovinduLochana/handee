using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using handee.API.DTO;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
public class PricingConfigController : ControllerBase
{
    private readonly IPricingConfigService _pricingConfigService;

    public PricingConfigController(IPricingConfigService pricingConfigService)
    {
        _pricingConfigService = pricingConfigService;
    }

    /// <summary>
    /// Gets current urgency multipliers for admin configuration.
    /// </summary>
    [HttpGet("admin/pricing-config/urgency-multipliers")]
    [HttpGet("api/admin/pricing-config/urgency-multipliers")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UrgencyMultiplierConfigDto>> GetAdminUrgencyMultipliers(CancellationToken ct)
    {
        var config = await _pricingConfigService.GetUrgencyMultipliersAsync(ct);
        return Ok(config);
    }

    /// <summary>
    /// Updates urgency multipliers with strict monotonic order and bounds validation.
    /// </summary>
    [HttpPut("admin/pricing-config/urgency-multipliers")]
    [HttpPut("api/admin/pricing-config/urgency-multipliers")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UrgencyMultiplierConfigDto>> UpdateUrgencyMultipliers(
        [FromBody] UrgencyMultiplierConfigDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updated = await _pricingConfigService.UpdateUrgencyMultipliersAsync(dto, ct);
        return Ok(updated);
    }

    /// <summary>
    /// Read-only endpoint for AI agent service or client applications to read active multipliers.
    /// </summary>
    [HttpGet("api/pricing-config/urgency-multipliers")]
    [AllowAnonymous]
    public async Task<ActionResult<UrgencyMultiplierConfigDto>> GetPublicUrgencyMultipliers(CancellationToken ct)
    {
        var config = await _pricingConfigService.GetUrgencyMultipliersAsync(ct);
        return Ok(config);
    }
}
