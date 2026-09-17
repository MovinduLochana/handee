using handee.API.DTO;

namespace handee.API.Interfaces;

public interface IAuthService
{
    Task<RegisterResult> RegisterAsync(RegisterDto dto);
    Task<LoginResult> LoginAsync(LoginDto dto);
    Task<TokenRefreshResult> RefreshAsync(RefreshRequestDto dto);
    Task LogoutAsync(RefreshRequestDto dto);
    Task ForgotPasswordAsync(ForgotPasswordDto dto);
    Task ResetPasswordAsync(ResetPasswordDto dto);
}
