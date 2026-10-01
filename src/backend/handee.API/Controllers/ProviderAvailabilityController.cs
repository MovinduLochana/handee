using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using handee.API.Common.Extensions;
using handee.API.DTO;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Route("api/provider-availability")]
[Authorize]
public class ProviderAvailabilityController : ControllerBase
{
    private readonly IProviderAvailabilityService _availabilityService;

    public ProviderAvailabilityController(IProviderAvailabilityService availabilityService)
    {
        _availabilityService = availabilityService;
    }

    // GET /api/provider-availability/slots?providerId={id}&date={yyyy-MM-dd}&durationHours=1
    [HttpGet("slots")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPredefinedSlots(
        [FromQuery] Guid providerId,
        [FromQuery] DateOnly date,
        [FromQuery] int durationHours = 1,
        CancellationToken ct = default)
    {
        var result = await _availabilityService.GetPredefinedSlotsForDateAsync(providerId, date, durationHours, ct);
        return Ok(result);
    }

    // GET /api/provider-availability/{providerId}/schedule
    [HttpGet("{providerId:guid}/schedule")]
    [AllowAnonymous]
    public async Task<IActionResult> GetOperatingSchedule(Guid providerId, CancellationToken ct)
    {
        var result = await _availabilityService.GetOperatingScheduleAsync(providerId, ct);
        return Ok(result);
    }

    // PUT /api/provider-availability/schedule
    [HttpPut("schedule")]
    [Authorize(Roles = "Provider")]
    public async Task<IActionResult> UpdateOperatingSchedule([FromBody] UpdateOperatingScheduleDto dto, CancellationToken ct)
    {
        var providerId = User.GetUserId();
        if (providerId is null) return Unauthorized();

        try
        {
            var result = await _availabilityService.UpdateOperatingScheduleAsync(providerId.Value, dto, ct);
            return Ok(result);
        }
        catch (ValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
