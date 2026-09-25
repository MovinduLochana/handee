using System.Security.Claims;
using handee.API.Common.Extensions;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace handee.API.Controllers;

[ApiController]
[Route("payouts")]
[Route("api/payouts")]
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
        var providerId = User.GetUserId();
        if (providerId is null) return Unauthorized();

        var summary = await _paymentService.GetProviderEarningsSummaryAsync(providerId.Value);
        return Ok(summary);
    }

    [HttpGet("provider/{providerId:guid}/summary")]
    public async Task<IActionResult> GetProviderSummary(Guid providerId)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null) return Unauthorized();

        if (currentUserId.Value != providerId && !User.IsInRole("Admin"))
            return Forbid("You can only access your own earnings summary.");

        var summary = await _paymentService.GetProviderEarningsSummaryAsync(providerId);
        return Ok(summary);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var providerId = User.GetUserId();
        if (providerId is null) return Unauthorized();

        var payouts = await _paymentService.GetProviderPayoutsAsync(providerId.Value);
        return Ok(payouts);
    }

    [HttpGet("provider/{providerId:guid}")]
    public async Task<IActionResult> GetByProvider(Guid providerId)
    {
        var currentUserId = User.GetUserId();
        if (currentUserId is null) return Unauthorized();

        if (currentUserId.Value != providerId && !User.IsInRole("Admin"))
            return Forbid("You can only access your own payouts.");

        var payouts = await _paymentService.GetProviderPayoutsAsync(providerId);
        return Ok(payouts);
    }

    [HttpGet("admin/overview")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAdminOverview()
    {
        var overview = await _paymentService.GetAdminPayoutsOverviewAsync();
        return Ok(overview);
    }

    [HttpPost("{id:guid}/process")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ProcessPayout(Guid id)
    {
        var updated = await _paymentService.ProcessPayoutAsync(id);
        return updated == null ? NotFound(new { message = $"Payout {id} not found." }) : Ok(updated);
    }


}
