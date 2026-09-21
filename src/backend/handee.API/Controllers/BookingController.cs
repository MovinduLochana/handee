using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Route("bookings")]
[Authorize]
public class BookingController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    // GET /bookings/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _bookingService.GetByIdAsync(id, userId.Value, User.IsInRole("Admin"));
        return result is null ? NotFound() : Ok(result);
    }

    // GET /bookings/mine
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var customerId = GetUserId();
        if (customerId is null) return Unauthorized();

        var result = await _bookingService.GetForCustomerAsync(customerId.Value);
        return Ok(result);
    }

    // GET /bookings/provider-mine
    [HttpGet("provider-mine")]
    public async Task<IActionResult> GetProviderMine()
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        var result = await _bookingService.GetForProviderAsync(providerId.Value);
        return Ok(result);
    }

    // GET /bookings/provider-offers
    [HttpGet("provider-offers")]
    public async Task<IActionResult> GetProviderOffers()
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        var result = await _bookingService.GetProviderOffersAsync(providerId.Value);
        return Ok(result);
    }

    // GET /bookings
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetForStaff(
        [FromQuery] BookingStatus? status,
        [FromQuery] bool sortDescending = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _bookingService.GetForStaffAsync(status, sortDescending, page, pageSize);
        return Ok(result);
    }

    // PUT /bookings/{id}/status
    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateBookingStatusDto dto)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var result = await _bookingService.UpdateStatusAsync(id, dto, userId.Value, User.IsInRole("Admin"));
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ValidationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
    }

    // PUT /bookings/{id}/schedule
    [HttpPut("{id:guid}/schedule")]
    public async Task<IActionResult> UpdateSchedule(Guid id, [FromBody] UpdateBookingScheduleDto dto)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var result = await _bookingService.UpdateScheduleAsync(id, dto, userId.Value, User.IsInRole("Admin"));
            return Ok(result);
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

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
