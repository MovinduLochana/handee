using System.Security.Claims;
using handee.API.Common.Extensions;
using handee.API.DTO;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace handee.API.Controllers;

[ApiController]
[Route("invoices")]
[Route("api/invoices")]
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
        var userId = User.GetUserId();
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
        var customerId = User.GetUserId();
        if (customerId is null) return Unauthorized();

        var invoices = await _invoiceService.GetCustomerInvoicesAsync(customerId.Value);
        return Ok(invoices);
    }

    [HttpGet("customer/{customerId:guid}")]
    public async Task<IActionResult> GetByCustomer(Guid customerId)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null) return Unauthorized();

        if (currentUserId.Value != customerId && !User.IsInRole("Admin"))
            return Forbid("You can only access your own invoices.");

        var invoices = await _invoiceService.GetCustomerInvoicesAsync(customerId);
        return Ok(invoices);
    }


    [HttpGet("provider-mine")]
    public async Task<IActionResult> GetProviderMine()
    {
        var providerId = User.GetUserId();
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

}
