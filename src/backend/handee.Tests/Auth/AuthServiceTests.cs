using Xunit;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using handee.API.Services;

namespace handee.Tests.Auth;

public class AuthServiceTests : IDisposable
{
    // ── Infrastructure ────────────────────────────────────────────────────────

    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly Mock<SignInManager<ApplicationUser>> _signInManagerMock;
    private readonly Mock<IJwtTokenGenerator> _jwtGeneratorMock;
    private readonly Mock<IRefreshTokenGenerator> _refreshGeneratorMock;
    private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock;
    private readonly AppDbContext _db;
    private readonly Mock<IProviderProfileRepository> _profileRepoForAuth;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        // UserManager mock — requires IUserStore at minimum
        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
            store.Object,
            Mock.Of<IOptions<IdentityOptions>>(),
            Mock.Of<IPasswordHasher<ApplicationUser>>(),
            Array.Empty<IUserValidator<ApplicationUser>>(),
            Array.Empty<IPasswordValidator<ApplicationUser>>(),
            Mock.Of<ILookupNormalizer>(),
            Mock.Of<IdentityErrorDescriber>(),
            Mock.Of<IServiceProvider>(),
            Mock.Of<ILogger<UserManager<ApplicationUser>>>());

        // SignInManager mock
        _signInManagerMock = new Mock<SignInManager<ApplicationUser>>(
            _userManagerMock.Object,
            Mock.Of<IHttpContextAccessor>(),
            Mock.Of<IUserClaimsPrincipalFactory<ApplicationUser>>(),
            Mock.Of<IOptions<IdentityOptions>>(),
            Mock.Of<ILogger<SignInManager<ApplicationUser>>>(),
            null!,
            null!);

        _jwtGeneratorMock = new Mock<IJwtTokenGenerator>();
        _refreshGeneratorMock = new Mock<IRefreshTokenGenerator>();

        // IHttpContextAccessor mock — returns null RemoteIpAddress by default
        _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        _httpContextAccessorMock.Setup(a => a.HttpContext).Returns((HttpContext?)null);

        // In-memory DB — unique name per test class instance
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(dbOptions);

        // Real ProviderProfileService with a stub repo — CreateProfileAsync only needs
        // GetByUserIdAsync (returns null = no existing profile) + AddAsync + SaveChangesAsync.
        _profileRepoForAuth = new Mock<IProviderProfileRepository>();
        _profileRepoForAuth
            .Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((handee.API.Entities.ProviderProfile?)null);
        _profileRepoForAuth
            .Setup(r => r.AddAsync(It.IsAny<handee.API.Entities.ProviderProfile>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _profileRepoForAuth
            .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var profileServiceForAuth = new ProviderProfileService(
            _profileRepoForAuth.Object,
            certRepo: null!,
            storage: null!,
            maps: null!,
            verificationService: null!,
            db: null!,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<ProviderProfileService>.Instance);

        _sut = new AuthService(
            _userManagerMock.Object,
            _signInManagerMock.Object,
            _jwtGeneratorMock.Object,
            _refreshGeneratorMock.Object,
            _db,
            _httpContextAccessorMock.Object,
            profileServiceForAuth);
    }

    public void Dispose() => _db.Dispose();

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ApplicationUser MakeUser(string role = "Customer", bool isActive = true) => new()
    {
        Id = Guid.NewGuid(),
        FullName = "Test User",
        Email = "test@example.com",
        UserName = "test@example.com",
        IsActive = isActive,
        ProviderVerificationStatus = ProviderVerificationStatus.Unverified
    };

    private static RegisterDto MakeRegisterDto(string role = "Customer") => new()
    {
        FullName = "Test User",
        Email = "test@example.com",
        Password = "Password@123",
        Role = role
    };

    // ── RegisterAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task RegisterAsync_HappyPath_ReturnsRegisterResult()
    {
        var dto = MakeRegisterDto();
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), dto.Password))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock
            .Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), dto.Role))
            .ReturnsAsync(IdentityResult.Success);

        var result = await _sut.RegisterAsync(dto);

        Assert.Equal(dto.Email, result.Email);
        Assert.Equal(dto.FullName, result.FullName);
        Assert.Equal(dto.Role, result.Role);
    }

    [Fact]
    public async Task RegisterAsync_IdentityFailure_ThrowsValidationException()
    {
        var dto = MakeRegisterDto();
        var errors = new[]
        {
            new IdentityError { Description = "Password too weak" },
            new IdentityError { Description = "Email already taken" }
        };
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), dto.Password))
            .ReturnsAsync(IdentityResult.Failed(errors));

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _sut.RegisterAsync(dto));
        Assert.Contains("Password too weak", ex.Message);
        Assert.Contains("Email already taken", ex.Message);
    }

    [Fact]
    public async Task RegisterAsync_Success_CallsAddToRoleWithCorrectRole()
    {
        var dto = MakeRegisterDto("Provider");
        _userManagerMock
            .Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), dto.Password))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock
            .Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), dto.Role))
            .ReturnsAsync(IdentityResult.Success);

        await _sut.RegisterAsync(dto);

        _userManagerMock.Verify(
            m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), "Provider"),
            Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_InvalidRole_ThrowsValidationException()
    {
        var dto = MakeRegisterDto("Admin"); // not in AllowedRoles

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _sut.RegisterAsync(dto));
        Assert.Contains("Admin", ex.Message);
    }

    // ── LoginAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_ValidCustomer_ReturnsTokensAndNoVerificationStatusClaim()
    {
        var user = MakeUser();
        var dto = new LoginDto { Email = user.Email!, Password = "Password@123" };

        _userManagerMock
            .Setup(m => m.FindByEmailAsync(dto.Email))
            .ReturnsAsync(user);
        _signInManagerMock
            .Setup(m => m.CheckPasswordSignInAsync(user, dto.Password, true))
            .ReturnsAsync(SignInResult.Success);
        _userManagerMock
            .Setup(m => m.GetRolesAsync(user))
            .ReturnsAsync(new List<string> { "Customer" });
        _jwtGeneratorMock
            .Setup(m => m.GenerateAccessToken(user, It.IsAny<IEnumerable<string>>(), null))
            .Returns("access-token");
        _refreshGeneratorMock
            .Setup(m => m.GenerateRefreshToken(user.Id, null))
            .Returns(("raw-refresh", new RefreshToken
            {
                UserId = user.Id,
                TokenHash = "hash",
                FamilyId = Guid.NewGuid(),
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(30)
            }));

        var result = await _sut.LoginAsync(dto);

        Assert.Equal("access-token", result.AccessToken);
        Assert.Equal("raw-refresh", result.RefreshToken);
        // Verify verificationStatus was NOT passed to the token generator
        _jwtGeneratorMock.Verify(
            m => m.GenerateAccessToken(user, It.IsAny<IEnumerable<string>>(), null),
            Times.Once);
    }

    [Fact]
    public async Task LoginAsync_ValidProvider_PassesVerificationStatusToTokenGenerator()
    {
        var user = MakeUser("Provider");
        user.ProviderVerificationStatus = ProviderVerificationStatus.Pending;
        var dto = new LoginDto { Email = user.Email!, Password = "Password@123" };

        _userManagerMock
            .Setup(m => m.FindByEmailAsync(dto.Email))
            .ReturnsAsync(user);
        _signInManagerMock
            .Setup(m => m.CheckPasswordSignInAsync(user, dto.Password, true))
            .ReturnsAsync(SignInResult.Success);
        _userManagerMock
            .Setup(m => m.GetRolesAsync(user))
            .ReturnsAsync(new List<string> { "Provider" });
        _jwtGeneratorMock
            .Setup(m => m.GenerateAccessToken(user, It.IsAny<IEnumerable<string>>(), "Pending"))
            .Returns("access-token");
        _refreshGeneratorMock
            .Setup(m => m.GenerateRefreshToken(user.Id, null))
            .Returns(("raw-refresh", new RefreshToken
            {
                UserId = user.Id,
                TokenHash = "hash",
                FamilyId = Guid.NewGuid(),
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(30)
            }));

        await _sut.LoginAsync(dto);

        _jwtGeneratorMock.Verify(
            m => m.GenerateAccessToken(user, It.IsAny<IEnumerable<string>>(), "Pending"),
            Times.Once);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedException()
    {
        var user = MakeUser();
        var dto = new LoginDto { Email = user.Email!, Password = "WrongPass!" };

        _userManagerMock.Setup(m => m.FindByEmailAsync(dto.Email)).ReturnsAsync(user);
        _signInManagerMock
            .Setup(m => m.CheckPasswordSignInAsync(user, dto.Password, true))
            .ReturnsAsync(SignInResult.Failed);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.LoginAsync(dto));
    }

    [Fact]
    public async Task LoginAsync_LockedAccount_ThrowsAccountLockedException()
    {
        var user = MakeUser();
        var dto = new LoginDto { Email = user.Email!, Password = "Password@123" };

        _userManagerMock.Setup(m => m.FindByEmailAsync(dto.Email)).ReturnsAsync(user);
        _signInManagerMock
            .Setup(m => m.CheckPasswordSignInAsync(user, dto.Password, true))
            .ReturnsAsync(SignInResult.LockedOut);

        await Assert.ThrowsAsync<AccountLockedException>(() => _sut.LoginAsync(dto));
    }

    [Fact]
    public async Task LoginAsync_InactiveUser_ThrowsUnauthorizedException()
    {
        var user = MakeUser(isActive: false);
        var dto = new LoginDto { Email = user.Email!, Password = "Password@123" };

        _userManagerMock.Setup(m => m.FindByEmailAsync(dto.Email)).ReturnsAsync(user);

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.LoginAsync(dto));
        Assert.Contains("inactive", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    // ── RefreshAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task RefreshAsync_ValidToken_RotatesAndReturnsNewPair()
    {
        var user = MakeUser();
        var familyId = Guid.NewGuid();
        var rawToken = "valid-raw-token";
        var tokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(rawToken)));

        var existing = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            FamilyId = familyId,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            Used = false,
            User = user
        };
        _db.RefreshTokens.Add(existing);
        await _db.SaveChangesAsync();

        _userManagerMock.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string> { "Customer" });
        _jwtGeneratorMock
            .Setup(m => m.GenerateAccessToken(user, It.IsAny<IEnumerable<string>>(), It.IsAny<string?>()))
            .Returns("new-access-token");
        _refreshGeneratorMock
            .Setup(m => m.GenerateRefreshToken(user.Id, familyId))
            .Returns(("new-raw-refresh", new RefreshToken
            {
                UserId = user.Id,
                TokenHash = "new-hash",
                FamilyId = familyId,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(30)
            }));

        var result = await _sut.RefreshAsync(new RefreshRequestDto { RefreshToken = rawToken });

        Assert.Equal("new-access-token", result.AccessToken);
        Assert.Equal("new-raw-refresh", result.RefreshToken);
        Assert.True(existing.Used);
        Assert.NotNull(existing.RevokedAt);
    }

    [Fact]
    public async Task RefreshAsync_ProviderToken_IncludesVerificationStatusInNewAccessToken()
    {
        var user = MakeUser("Provider");
        user.ProviderVerificationStatus = ProviderVerificationStatus.Verified;
        var familyId = Guid.NewGuid();
        var rawToken = "provider-refresh-token";
        var tokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(rawToken)));

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            FamilyId = familyId,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            Used = false,
            User = user
        });
        await _db.SaveChangesAsync();

        _userManagerMock.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string> { "Provider" });
        _jwtGeneratorMock
            .Setup(m => m.GenerateAccessToken(user, It.IsAny<IEnumerable<string>>(), "Verified"))
            .Returns("provider-access-token");
        _refreshGeneratorMock
            .Setup(m => m.GenerateRefreshToken(user.Id, familyId))
            .Returns(("new-raw-refresh", new RefreshToken
            {
                UserId = user.Id,
                TokenHash = "new-hash",
                FamilyId = familyId,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(30)
            }));

        await _sut.RefreshAsync(new RefreshRequestDto { RefreshToken = rawToken });

        // Verify that "Verified" was passed to GenerateAccessToken
        _jwtGeneratorMock.Verify(
            m => m.GenerateAccessToken(user, It.IsAny<IEnumerable<string>>(), "Verified"),
            Times.Once);
    }

    [Fact]
    public async Task RefreshAsync_ExpiredToken_ThrowsUnauthorizedException()
    {
        var rawToken = "expired-token";
        var tokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(rawToken)));

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = Guid.NewGuid(),
            TokenHash = tokenHash,
            FamilyId = Guid.NewGuid(),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(-1), // expired
            Used = false,
            User = MakeUser()
        });
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(
            () => _sut.RefreshAsync(new RefreshRequestDto { RefreshToken = rawToken }));
        Assert.Contains("Invalid or expired", ex.Message);
    }

    [Fact]
    public async Task RefreshAsync_InactiveUser_ThrowsUnauthorizedException()
    {
        var user = MakeUser(isActive: false);
        var rawToken = "inactive-user-token";
        var tokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(rawToken)));

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            FamilyId = Guid.NewGuid(),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            Used = false,
            User = user
        });
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(
            () => _sut.RefreshAsync(new RefreshRequestDto { RefreshToken = rawToken }));
        Assert.Contains("inactive", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RefreshAsync_ReusedToken_RevokesEntireFamilyAndThrows()
    {
        var user = MakeUser();
        var familyId = Guid.NewGuid();
        var rawToken = "already-used-token";
        var tokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(rawToken)));

        // The replayed token — already used
        var usedToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            FamilyId = familyId,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            Used = true, // already consumed
            User = user
        };
        // Another active token in the same family (should be revoked on replay)
        var siblingToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = "sibling-hash",
            FamilyId = familyId,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            Used = false,
            User = user
        };

        _db.RefreshTokens.AddRange(usedToken, siblingToken);
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(
            () => _sut.RefreshAsync(new RefreshRequestDto { RefreshToken = rawToken }));

        Assert.Contains("reuse detected", ex.Message);

        // All family tokens must now be revoked
        var familyTokens = _db.RefreshTokens.Where(r => r.FamilyId == familyId).ToList();
        Assert.All(familyTokens, t => Assert.NotNull(t.RevokedAt));
    }

    [Fact]
    public async Task RefreshAsync_UnknownToken_ThrowsUnauthorizedException()
    {
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(
            () => _sut.RefreshAsync(new RefreshRequestDto { RefreshToken = "this-token-does-not-exist" }));
        Assert.Contains("Invalid or expired", ex.Message);
    }

    // ── LogoutAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task LogoutAsync_ValidToken_RevokesToken()
    {
        var rawToken = "logout-token";
        var tokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(rawToken)));

        var token = new RefreshToken
        {
            UserId = Guid.NewGuid(),
            TokenHash = tokenHash,
            FamilyId = Guid.NewGuid(),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            Used = false
        };
        _db.RefreshTokens.Add(token);
        await _db.SaveChangesAsync();

        await _sut.LogoutAsync(new RefreshRequestDto { RefreshToken = rawToken });

        Assert.True(token.Used);
        Assert.NotNull(token.RevokedAt);
    }

    [Fact]
    public async Task LogoutAsync_AlreadyRevokedToken_IsIdempotent()
    {
        var rawToken = "already-revoked-token";
        var tokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(rawToken)));

        var token = new RefreshToken
        {
            UserId = Guid.NewGuid(),
            TokenHash = tokenHash,
            FamilyId = Guid.NewGuid(),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            Used = true, // already revoked
            RevokedAt = DateTimeOffset.UtcNow.AddHours(-1)
        };
        _db.RefreshTokens.Add(token);
        await _db.SaveChangesAsync();

        // Should complete without throwing
        var exception = await Record.ExceptionAsync(
            () => _sut.LogoutAsync(new RefreshRequestDto { RefreshToken = rawToken }));
        Assert.Null(exception);
    }
}
