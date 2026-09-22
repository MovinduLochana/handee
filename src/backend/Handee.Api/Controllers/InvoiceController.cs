using System.Security.Claims;
using handee.API.DTO;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace handee.API.Controllers;

[ApiController]
[Route("invoices")]
[Authorize]
public class InvoiceController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public InvoiceController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceDto dto)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var invoice = await _invoiceService.CreateInvoiceAsync(dto, userId.Value);
            return StatusCode(StatusCodes.Status201Created, invoice);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var invoice = await _invoiceService.GetInvoiceByIdAsync(id);
        return invoice == null ? NotFound() : Ok(invoice);
    }

    [HttpGet("booking/{bookingId:guid}")]
    public async Task<IActionResult> GetByBookingId(Guid bookingId)
    {
        var invoice = await _invoiceService.GetInvoiceByBookingIdAsync(bookingId);
        return invoice == null ? NotFound() : Ok(invoice);
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var customerId = GetUserId();
        if (customerId is null) return Unauthorized();

        var invoices = await _invoiceService.GetCustomerInvoicesAsync(customerId.Value);
        return Ok(invoices);
    }

    [HttpGet("provider-mine")]
    public async Task<IActionResult> GetProviderMine()
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        var invoices = await _invoiceService.GetProviderInvoicesAsync(providerId.Value);
        return Ok(invoices);
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var invoices = await _invoiceService.GetAllInvoicesAsync();
        return Ok(invoices);
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateInvoiceStatusDto dto)
    {
        var updated = await _invoiceService.UpdateInvoiceStatusAsync(id, dto);
        return updated == null ? NotFound() : Ok(updated);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
