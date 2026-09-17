using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace handee.Tests.Auth;

public class UserPhotoUploadServiceTests
{
    // ── Infrastructure ────────────────────────────────────────────────────────

    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly Mock<IStorageService> _storageMock = new();

    public UserPhotoUploadServiceTests()
    {
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
    }

    private UserService BuildSut() => new(_userManagerMock.Object, _storageMock.Object);

    private static ApplicationUser MakeUser(string id) => new()
    {
        Id = Guid.Parse(id),
        FullName = "Test User",
        Email = "test@example.com",
        UserName = "test@example.com",
        IsActive = true
    };

    private static IFormFile MakePhotoFile(string name = "avatar.jpg")
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.FileName).Returns(name);
        mock.Setup(f => f.Length).Returns(4096);
        return mock.Object;
    }

    // ── Test 1: happy path — URL is stored on the user and returned ───────────

    [Fact]
    public async Task UploadPhotoAsync_ValidUser_UpdatesProfilePictureUrl_And_Returns_Url()
    {
        var userId = Guid.NewGuid().ToString();
        var user   = MakeUser(userId);
        var photo  = MakePhotoFile();
        const string expectedUrl = "/uploads/photos/avatar.jpg";

        _userManagerMock
            .Setup(m => m.FindByIdAsync(userId))
            .ReturnsAsync(user);

        _storageMock
            .Setup(s => s.UploadAsync(photo, "photos", It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedUrl);

        _userManagerMock
            .Setup(m => m.UpdateAsync(user))
            .ReturnsAsync(IdentityResult.Success);

        var sut    = BuildSut();
        var result = await sut.UploadPhotoAsync(userId, photo);

        // Returned URL matches storage
        Assert.Equal(expectedUrl, result);

        // Entity was mutated
        Assert.Equal(expectedUrl, user.ProfilePictureUrl);

        // Persisted via Identity
        _userManagerMock.Verify(m => m.UpdateAsync(user), Times.Once);
    }

    // ── Test 2: user not found throws NotFoundException ───────────────────────

    [Fact]
    public async Task UploadPhotoAsync_UserNotFound_Throws_NotFoundException()
    {
        var unknownId = Guid.NewGuid().ToString();

        _userManagerMock
            .Setup(m => m.FindByIdAsync(unknownId))
            .ReturnsAsync((ApplicationUser?)null);

        var sut = BuildSut();

        await Assert.ThrowsAsync<NotFoundException>(
            () => sut.UploadPhotoAsync(unknownId, MakePhotoFile()));

        // Storage must NOT be called
        _storageMock.Verify(
            s => s.UploadAsync(It.IsAny<IFormFile>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // ── Test 3: Identity UpdateAsync failure throws ValidationException ────────

    [Fact]
    public async Task UploadPhotoAsync_IdentityUpdateFails_Throws_ValidationException()
    {
        var userId = Guid.NewGuid().ToString();
        var user   = MakeUser(userId);
        var photo  = MakePhotoFile();

        _userManagerMock
            .Setup(m => m.FindByIdAsync(userId))
            .ReturnsAsync(user);

        _storageMock
            .Setup(s => s.UploadAsync(photo, "photos", It.IsAny<CancellationToken>()))
            .ReturnsAsync("/uploads/photos/avatar.jpg");

        _userManagerMock
            .Setup(m => m.UpdateAsync(user))
            .ReturnsAsync(IdentityResult.Failed(
                new IdentityError { Description = "Concurrency failure" }));

        var sut = BuildSut();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => sut.UploadPhotoAsync(userId, photo));

        Assert.Contains("Concurrency failure", ex.Message);
    }
}
