using System.Security.Claims;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace handee.API.Controllers;

[ApiController]
[Route("payouts")]
[Authorize]
public class PayoutController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PayoutController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        var summary = await _paymentService.GetProviderEarningsSummaryAsync(providerId.Value);
        return Ok(summary);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var providerId = GetUserId();
        if (providerId is null) return Unauthorized();

        var payouts = await _paymentService.GetProviderPayoutsAsync(providerId.Value);
        return Ok(payouts);
    }

    [HttpGet("provider/{providerId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetByProvider(Guid providerId)
    {
        var payouts = await _paymentService.GetProviderPayoutsAsync(providerId);
        return Ok(payouts);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
