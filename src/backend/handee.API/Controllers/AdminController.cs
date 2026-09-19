using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Route("admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    // GET /admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _adminService.GetUsersAsync();
        return Ok(users);
    }

    // PUT /admin/users/{id}/status
    [HttpPut("users/{id:guid}/status")]
    public async Task<IActionResult> SetUserStatus(Guid id, [FromBody] SetUserStatusDto dto)
    {
        try
        {
            await _adminService.SetUserStatusAsync(id, dto.IsActive);
            return NoContent();
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    // PUT /admin/users/{id}/verification
    [HttpPut("users/{id:guid}/verification")]
    public async Task<IActionResult> SetVerificationStatus(
        Guid id, [FromBody] SetVerificationStatusDto dto)
    {
        try
        {
            await _adminService.SetVerificationStatusAsync(id, dto.Status);
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

    [HttpPatch("certifications/{certId:guid}/review")]
    public async Task<IActionResult> ReviewCertification(
        Guid certId, [FromBody] ReviewCertificationDto dto, CancellationToken ct)
    {
        var adminId = Guid.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);
        try
        {
            await _adminService.ReviewCertificationAsync(certId, adminId, dto.Status, ct);
            return NoContent();
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpGet("verifications")]
    public async Task<IActionResult> GetVerificationQueue(
        [FromQuery] VerificationStatus? status,
        [FromQuery] string? searchTerm,
        [FromQuery] Guid? skillCategoryId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await _adminService.GetVerificationQueueAsync(status, searchTerm, skillCategoryId, page, pageSize, ct);
        return Ok(result);
    }

    // GET /admin/verifications/summary
    [HttpGet("verifications/summary")]
    public async Task<IActionResult> GetVerificationSummary(CancellationToken ct = default)
    {
        var result = await _adminService.GetVerificationSummaryAsync(ct);
        return Ok(result);
    }
}

// ── Inline request DTOs (simple, admin-only) ─────────────────────────────────

public record SetUserStatusDto(bool IsActive);
public record SetVerificationStatusDto(ProviderVerificationStatus Status);
public record ReviewCertificationDto(DocumentReviewStatus Status);
