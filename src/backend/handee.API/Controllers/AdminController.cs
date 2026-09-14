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

    // PATCH /admin/certifications/{certId}/review
    [HttpPatch("certifications/{certId:guid}/review")]
    public async Task<IActionResult> ReviewCertification(
        Guid certId, [FromBody] ReviewCertificationDto dto, CancellationToken ct)
    {
        try
        {
            await _adminService.ReviewCertificationAsync(certId, dto.Status, ct);
            return NoContent();
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}

// ── Inline request DTOs (simple, admin-only) ─────────────────────────────────

public record SetUserStatusDto(bool IsActive);
public record SetVerificationStatusDto(ProviderVerificationStatus Status);
public record ReviewCertificationDto(DocumentReviewStatus Status);
