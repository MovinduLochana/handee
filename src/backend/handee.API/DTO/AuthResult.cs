namespace handee.API.DTO;

public record RegisterResult(Guid Id, string Email, string FullName, string Role);

public record LoginResult(string AccessToken, string RefreshToken);

public record TokenRefreshResult(string AccessToken, string RefreshToken);
