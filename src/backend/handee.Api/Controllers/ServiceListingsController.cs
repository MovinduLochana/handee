using System.Security.Claims;
using handee.API.DTO.ServiceListing;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace handee.API.Controllers;

[ApiController]
[Route("api/service-listings")]
public class ServiceListingsController : ControllerBase
{
    private readonly IServiceListingService _service;

    public ServiceListingsController(IServiceListingService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> SearchActiveListings([FromQuery] string? query, [FromQuery] Guid? categoryId)
    {
        var result = await _service.SearchActiveListingsAsync(query, categoryId);
        return Ok(result);
    }

    [HttpGet("provider/{providerId:guid}")]
    public async Task<IActionResult> GetProviderListings(Guid providerId)
    {
        var result = await _service.GetListingsByProviderProfileIdAsync(providerId);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetListingById(Guid id)
    {
        var result = await _service.GetListingByIdAsync(id);
        return Ok(result);
    }

    [HttpGet("my-listings")]
    [Authorize(Roles = "Provider,Admin")]
    public async Task<IActionResult> GetMyListings()
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        var result = await _service.GetProviderListingsAsync(providerId.Value);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Provider,Admin")]
    public async Task<IActionResult> CreateListing([FromBody] CreateServiceListingDto dto)
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        var result = await _service.CreateListingAsync(providerId.Value, dto);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Provider,Admin")]
    public async Task<IActionResult> UpdateListing(Guid id, [FromBody] UpdateServiceListingDto dto)
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        var result = await _service.UpdateListingAsync(id, providerId.Value, dto);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Provider,Admin")]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromBody] handee.API.DTO.ServiceListing.ActiveStatusDto dto)
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        await _service.ToggleActiveStatusAsync(providerId.Value, id, dto.IsActive);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Provider,Admin")]
    public async Task<IActionResult> DeleteListing(Guid id)
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        await _service.DeleteListingAsync(id, providerId.Value);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
