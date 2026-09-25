using System.Security.Claims;
using handee.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace handee.Tests.Hubs;

public class BookingHubTests
{
    private readonly Mock<HubCallerContext> _mockContext;
    private readonly Mock<IGroupManager> _mockGroups;
    private readonly Mock<IHubCallerClients<IBookingClient>> _mockClients;
    private readonly BookingHub _hub;

    public BookingHubTests()
    {
        _mockContext = new Mock<HubCallerContext>();
        _mockGroups = new Mock<IGroupManager>();
        _mockClients = new Mock<IHubCallerClients<IBookingClient>>();

        _hub = new BookingHub
        {
            Context = _mockContext.Object,
            Groups = _mockGroups.Object,
            Clients = _mockClients.Object
        };
    }

    [Fact]
    public async Task OnConnectedAsync_WhenUserIsCustomer_AddsConnectionToCustomerGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var connectionId = "conn-123";
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, "Customer")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _mockContext.Setup(c => c.ConnectionId).Returns(connectionId);
        _mockContext.Setup(c => c.User).Returns(principal);

        // Act
        await _hub.OnConnectedAsync();

        // Assert
        _mockGroups.Verify(g => g.AddToGroupAsync(connectionId, $"Customer_{userId}", default), Times.Once);
    }

    [Fact]
    public async Task OnConnectedAsync_WhenUserIsProvider_AddsConnectionToProviderGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var connectionId = "conn-provider";
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, "Provider")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _mockContext.Setup(c => c.ConnectionId).Returns(connectionId);
        _mockContext.Setup(c => c.User).Returns(principal);

        // Act
        await _hub.OnConnectedAsync();

        // Assert
        _mockGroups.Verify(g => g.AddToGroupAsync(connectionId, $"Provider_{userId}", default), Times.Once);
    }

    [Fact]
    public async Task OnConnectedAsync_WhenUserIsAdmin_AddsConnectionToAdminGroup()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var connectionId = "conn-admin";
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, "Admin")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _mockContext.Setup(c => c.ConnectionId).Returns(connectionId);
        _mockContext.Setup(c => c.User).Returns(principal);

        // Act
        await _hub.OnConnectedAsync();

        // Assert
        _mockGroups.Verify(g => g.AddToGroupAsync(connectionId, "Admin", default), Times.Once);
    }

    [Fact]
    public async Task OnConnectedAsync_WhenUserUnauthenticated_DoesNotThrowAndDoesNotAddToGroups()
    {
        // Arrange
        _mockContext.Setup(c => c.ConnectionId).Returns("conn-anon");
        _mockContext.Setup(c => c.User).Returns((ClaimsPrincipal?)null);

        // Act
        var act = () => _hub.OnConnectedAsync();

        // Assert
        await act();
        _mockGroups.Verify(g => g.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task OnDisconnectedAsync_GracefullyCompletesWithoutExceptions()
    {
        // Act
        var act = () => _hub.OnDisconnectedAsync(new Exception("Network drop"));

        // Assert
        await act();
    }
}
