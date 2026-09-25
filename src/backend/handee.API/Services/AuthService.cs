using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using Microsoft.AspNetCore.WebUtilities;

namespace handee.API.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IRefreshTokenGenerator _refreshTokenGenerator;
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IProviderProfileService _providerProfileService;
    private readonly IEmailService _emailService;

    private static readonly HashSet<string> AllowedRoles =
        new(StringComparer.OrdinalIgnoreCase) { "Customer", "Provider" };

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtTokenGenerator jwtTokenGenerator,
        IRefreshTokenGenerator refreshTokenGenerator,
        AppDbContext db,
        IHttpContextAccessor httpContextAccessor,
        IProviderProfileService providerProfileService,
        IEmailService emailService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtTokenGenerator = jwtTokenGenerator;
        _refreshTokenGenerator = refreshTokenGenerator;
        _db = db;
        _httpContextAccessor = httpContextAccessor;
        _providerProfileService = providerProfileService;
        _emailService = emailService;
    }

    // ── Register ─────────────────────────────────────────────────────────────

    public async Task<RegisterResult> RegisterAsync(RegisterDto dto)
    {
        // Server-side role guard: reject roles not in the allowed set
        if (!AllowedRoles.Contains(dto.Role))
            throw new ValidationException(
                $"Role '{dto.Role}' is not valid. Accepted values: Customer, Provider.");

        var user = new ApplicationUser
        {
            FullName  = dto.FullName,
            Email     = dto.Email,
            UserName  = dto.Email,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(" | ", result.Errors.Select(e => e.Description));
            throw new ValidationException(errors);
        }

        await _userManager.AddToRoleAsync(user, dto.Role);

        // Auto-create a blank ProviderProfile so the profile always exists
        if (dto.Role == "Provider")
            await _providerProfileService.CreateProfileAsync(user.Id);

        return new RegisterResult(user.Id, user.Email!, user.FullName, dto.Role);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    public async Task<LoginResult> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email)
            ?? throw new UnauthorizedException("Invalid credentials.");

        // Soft-delete / suspension check
        if (!user.IsActive)
            throw new UnauthorizedException("Account is inactive.");

        var result = await _signInManager.CheckPasswordSignInAsync(
            user, dto.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
            throw new AccountLockedException("Account is locked out.");

        if (!result.Succeeded)
            throw new UnauthorizedException("Invalid credentials.");

        var roles = await _userManager.GetRolesAsync(user);

        // Include verification status claim for Provider-role users
        var verificationStatus = roles.Contains("Provider")
            ? user.ProviderVerificationStatus.ToString()
            : null;

        var accessToken = _jwtTokenGenerator.GenerateAccessToken(user, roles, verificationStatus);
        var (rawRefreshToken, refreshTokenEntity) =
            _refreshTokenGenerator.GenerateRefreshToken(user.Id);

        // Capture the requester's IP address (#6)
        refreshTokenEntity.CreatedByIp =
            _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

        await _db.RefreshTokens.AddAsync(refreshTokenEntity);
        await _db.SaveChangesAsync();

        return new LoginResult(accessToken, rawRefreshToken);
    }

    // ── Refresh ───────────────────────────────────────────────────────────────

    public async Task<TokenRefreshResult> RefreshAsync(RefreshRequestDto dto)
    {
        var tokenHash = HashToken(dto.RefreshToken);

        var existing = await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash);

        if (existing == null || existing.ExpiresAt <= DateTimeOffset.UtcNow)
            throw new UnauthorizedException("Invalid or expired refresh token.");

        // Reuse detection — revoke entire token family on replay
        if (existing.Used || existing.RevokedAt != null)
        {
            await RevokeTokenFamilyAsync(existing.FamilyId);
            throw new UnauthorizedException(
                "Refresh token reuse detected. All sessions have been revoked.");
        }

        // Suspension check — deny rotation if account was deactivated after login
        if (!existing.User.IsActive)
            throw new UnauthorizedException("Account is inactive.");

        // Rotate: mark old token consumed, issue new pair
        existing.Used = true;
        existing.RevokedAt = DateTimeOffset.UtcNow;

        var roles = await _userManager.GetRolesAsync(existing.User);

        // Re-include verificationStatus for Provider-role users (#2)
        var verificationStatus = roles.Contains("Provider")
            ? existing.User.ProviderVerificationStatus.ToString()
            : null;

        var newAccessToken = _jwtTokenGenerator.GenerateAccessToken(
            existing.User, roles, verificationStatus);

        var (rawRefreshToken, newEntity) =
            _refreshTokenGenerator.GenerateRefreshToken(existing.UserId, existing.FamilyId);

        // Capture the requester's IP address (#6)
        newEntity.CreatedByIp =
            _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

        _db.RefreshTokens.Add(newEntity);
        await _db.SaveChangesAsync();

        return new TokenRefreshResult(newAccessToken, rawRefreshToken);
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    public async Task LogoutAsync(RefreshRequestDto dto)
    {
        var tokenHash = HashToken(dto.RefreshToken);

        var token = await _db.RefreshTokens
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash);

        // Already invalid — idempotent, nothing to do
        if (token == null || token.Used || token.RevokedAt != null)
            return;

        token.Used = true;
        token.RevokedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    // ── Password Reset ────────────────────────────────────────────────────────

    public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null || !user.IsActive)
        {
            // Do not reveal that the user does not exist or is inactive
            return;
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        
        // Encode token to be URL-safe
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

        // Note: The frontend route can be configured as needed.
        // Assuming hitting localhost:5173 for local frontend testing.
        var resetLink = $"http://localhost:5173/reset-password?token={encodedToken}&email={user.Email}";
        
        var body = $@"
            <h3>Password Reset Request</h3>
            <p>You requested a password reset for your handee account.</p>
            <p>Click the link below to reset your password:</p>
            <a href='{resetLink}'>Reset Password</a>
            <p>If you did not request this, you can safely ignore this email.</p>";

        await _emailService.SendEmailAsync(user.Email, "Reset your password", body);
    }

    public async Task ResetPasswordAsync(ResetPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
            throw new ValidationException("Invalid email or token.");

        // Decode the URL-safe token
        string decodedToken;
        try
        {
            decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(dto.Token));
        }
        catch (FormatException)
        {
            throw new ValidationException("Invalid token format.");
        }

        var result = await _userManager.ResetPasswordAsync(user, decodedToken, dto.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(" | ", result.Errors.Select(e => e.Description));
            throw new ValidationException(errors);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static string HashToken(string rawToken)
    {
        var bytes = Encoding.UTF8.GetBytes(rawToken);
        return Convert.ToBase64String(SHA256.HashData(bytes));
    }

    private async Task RevokeTokenFamilyAsync(Guid familyId)
    {
        var familyTokens = await _db.RefreshTokens
            .Where(r => r.FamilyId == familyId && r.RevokedAt == null)
            .ToListAsync();

        foreach (var t in familyTokens)
        {
            t.RevokedAt = DateTimeOffset.UtcNow;
            t.Used = true;
        }

        await _db.SaveChangesAsync();
    }
}