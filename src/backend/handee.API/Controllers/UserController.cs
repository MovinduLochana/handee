using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using handee.API.DTO;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IStorageService _storage;

    public UserController(IUserService userService, IStorageService storage)
    {
        _userService = userService;
        _storage     = storage;
    }

    // GET /users/me
    [HttpGet("me")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var profile = await _userService.GetProfileAsync(userId);
            return Ok(profile);
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    // PUT /users/me
    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        try
        {
            await _userService.UpdateProfileAsync(userId, dto);
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

    // POST /users/me/photo
    // Any authenticated user (Customer, Provider, Admin) — multipart/form-data
    [HttpPost("me/photo")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadPhoto(
        [FromForm] IFormFile photo, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var photoUrl = await _userService.UploadPhotoAsync(userId, photo, ct);
            return Ok(new { profilePictureUrl = photoUrl });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    private string? GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
}
