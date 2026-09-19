using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using handee.API.DTO;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // POST /auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        try
        {
            var result = await _authService.RegisterAsync(dto);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (ValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // POST /auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            var result = await _authService.LoginAsync(dto);
            return Ok(result);
        }
        catch (AccountLockedException ex)
        {
            return StatusCode(StatusCodes.Status423Locked, ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    // POST /auth/refresh
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequestDto dto)
    {
        try
        {
            var result = await _authService.RefreshAsync(dto);
            return Ok(result);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    // POST /auth/logout
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequestDto dto)
    {
        await _authService.LogoutAsync(dto);
        return NoContent();
    }

    // POST /auth/forgot-password
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        await _authService.ForgotPasswordAsync(dto);
        return Ok(new { message = "If an account with that email exists and is active, a reset link will be sent." });
    }

    // POST /auth/reset-password
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        try
        {
            await _authService.ResetPasswordAsync(dto);
            return Ok(new { message = "Password has been successfully reset." });
        }
        catch (ValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}