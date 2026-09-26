using handee.API.Common.Extensions;
using handee.API.DTO.Provider;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace handee.API.Controllers;

[ApiController]
[Route("api/providers")]
[Authorize]
public class ProviderController(
    IProviderProfileService profileService,
    IVerificationService verificationService,
    IProviderTrustService trustService,
    IConfiguration config,
    ILogger<ProviderController> logger) : ControllerBase
{
    // ─── GET /api/providers/me ────────────────────────────────────────────
    // Provider only — resolves their own profile from the JWT
    [HttpGet("me")]
    [Authorize(Roles = "Provider")]
    public async Task<IActionResult> GetMyProfile(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var profile = await profileService.GetProfileByUserIdAsync(userId.Value, ct);
            return Ok(profile);
        }
        catch (KeyNotFoundException)
        {
            await profileService.CreateProfileAsync(userId.Value, ct);
            var profile = await profileService.GetProfileByUserIdAsync(userId.Value, ct);
            return Ok(profile);
        }
    }

    // ─── GET /api/providers/{id} ──────────────────────────────────────────
    // Provider (own), Admin (any), Customer (public projection)
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProfile(Guid id, CancellationToken ct)
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "Customer";

        // Providers can only see their own profile (unless Admin)
        if (role == "Provider")
        {
            var callerId = User.GetUserId();
            if (callerId is null) return Unauthorized();
            var ownerId = await profileService.GetOwnerUserIdAsync(id, ct);
            if (ownerId != callerId)
                return Forbid();
        }

        try
        {
            var result = await profileService.GetProfileAsync(id, role, ct);
            if (result is null)
            {
                return NotFound(new { error = $"ProviderProfile {id} not found." });
            }

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            // Keep existing behavior for other callers that still throw KeyNotFoundException
            return NotFound(new { error = ex.Message });
        }
    }

    // ─── PUT /api/providers/{id} ──────────────────────────────────────────
    // Provider (own only)
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Provider")]
    public async Task<IActionResult> UpdateProfile(
        Guid id, [FromBody] UpdateProviderProfileDto dto, CancellationToken ct)
    {
        if (!await IsOwnProfile(id, ct)) return Forbid();

        await profileService.UpdateProfileAsync(id, dto, ct);
        return NoContent();
    }

    // ─── POST /api/providers/{id}/documents ───────────────────────────────
    // Provider (own only) — multipart/form-data
    [HttpPost("{id:guid}/documents")]
    [Authorize(Roles = "Provider")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument(
        Guid id, [FromForm] DocumentUploadDto dto, CancellationToken ct)
    {
        if (!await IsOwnProfile(id, ct)) return Forbid();

        var cert = await profileService.UploadDocumentAsync(id, dto, ct);
        return Created($"api/providers/{id}/documents/{cert.Id}", new
        {
            cert.Id,
            cert.Type,
            cert.FileUrl,
            cert.OriginalFileName,
            cert.UploadedAt,
            cert.ReviewStatus
        });
    }


    // ─── PATCH /api/providers/{id}/verification ───────────────────────────
    // Admin only — approve / reject
    [HttpPatch("{id:guid}/verification")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateVerification(
        Guid id, [FromBody] VerificationActionDto dto, CancellationToken ct)
    {
        var adminId = User.GetUserId();
        if (adminId == null || adminId == Guid.Empty)
            return Unauthorized();

        try
        {
            await verificationService.TransitionAsync(id, adminId.Value, dto.NewStatus, dto.Note, ct);
            await trustService.InvalidateCacheAsync(id, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning("Illegal verification transition attempt on {ProfileId}: {Message}", id, ex.Message);
            return BadRequest(new { error = ex.Message });
        }
    }

    // ─── GET /api/providers/search ────────────────────────────────────────
    // Public / Authenticated — for Directory listing
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> Search(
        [FromQuery] string? searchTerm,
        [FromQuery] Guid? serviceCategoryId,
        [FromQuery] double? lat,
        [FromQuery] double? lng,
        [FromQuery] double radiusKm = 25,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var normalizedPage = Math.Max(page, 1);
        var normalizedPageSize = Math.Clamp(pageSize, 1, 100);
        var skip = (normalizedPage - 1) * normalizedPageSize;

        var results = await profileService.SearchAsync(
            searchTerm,
            serviceCategoryId,
            lat,
            lng,
            radiusKm,
            skip,
            normalizedPageSize,
            ct);
        return Ok(results);
    }

    // ─── GET /api/internal/providers/{id}/trust-signals ──────────────────
    // Internal — consumed by the Python Agentic AI service via shared API key
    [HttpGet("/api/internal/providers/{id:guid}/trust-signals")]
    [AllowAnonymous] // Auth is via API key header, not JWT
    public async Task<IActionResult> GetTrustSignals(Guid id, CancellationToken ct)
    {
        // Validate internal API key
        var expectedKey = config["InternalApi:SharedSecret"];
        if (string.IsNullOrEmpty(expectedKey) ||
            !Request.Headers.TryGetValue("X-Internal-Api-Key", out var providedKey) ||
            providedKey != expectedKey)
        {
            return Unauthorized(new { error = "Invalid or missing internal API key." });
        }

        try
        {
            var dto = await trustService.GetProviderTrustSignals(id, ct);
            return Ok(dto);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private async Task<bool> IsOwnProfile(Guid profileId, CancellationToken ct)
    {
        var callerId = User.GetUserId();
        if (callerId is null) return false;
        var ownerId = await profileService.GetOwnerUserIdAsync(profileId, ct);
        return ownerId == callerId.Value;
    }
}
