using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using handee.API.Common.Extensions;
using handee.API.DTO;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Route("provider-availability")]
[Route("api/provider-availability")]
[Authorize]
public class ProviderAvailabilityController : ControllerBase
{
    private readonly IProviderAvailabilityService _availabilityService;

    public ProviderAvailabilityController(IProviderAvailabilityService availabilityService)
    {
        _availabilityService = availabilityService;
    }

    // POST /provider-availability
    [HttpPost]
    [Authorize(Roles = "Provider")]
    public async Task<IActionResult> Create([FromBody] CreateSlotDto dto)
    {
        var providerId = User.GetUserId();
        if (providerId is null) return Unauthorized();

        try
        {
            var result = await _availabilityService.CreateSlotAsync(providerId.Value, dto);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (ValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // GET /provider-availability/{providerId}
    [HttpGet("{providerId:guid}")]
    public async Task<IActionResult> GetForProvider(Guid providerId)
    {
        var result = await _availabilityService.GetForProviderAsync(providerId);
        return Ok(result);
    }

    // GET /provider-availability/mine
    [HttpGet("mine")]
    [Authorize(Roles = "Provider")]
    public async Task<IActionResult> GetMine()
    {
        var providerId = User.GetUserId();
        if (providerId is null) return Unauthorized();

        var result = await _availabilityService.GetOwnAsync(providerId.Value);
        return Ok(result);
    }

    // DELETE /provider-availability/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Provider")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var providerId = User.GetUserId();
        if (providerId is null) return Unauthorized();

        try
        {
            await _availabilityService.DeleteSlotAsync(id, providerId.Value);
            return NoContent();
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

}
