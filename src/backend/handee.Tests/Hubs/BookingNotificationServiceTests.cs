using handee.API.Entities;
using handee.API.Hubs;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace handee.Tests.Hubs;

public class BookingNotificationServiceTests
{
    private readonly Mock<IHubContext<BookingHub, IBookingClient>> _mockHubContext;
    private readonly Mock<IHubClients<IBookingClient>> _mockClients;
    private readonly Mock<IBookingClient> _mockCustomerGroup;
    private readonly Mock<IBookingClient> _mockProviderGroup;
    private readonly Mock<IBookingClient> _mockAdminGroup;
    private readonly BookingNotificationService _service;

    public BookingNotificationServiceTests()
    {
        _mockHubContext = new Mock<IHubContext<BookingHub, IBookingClient>>();
        _mockClients = new Mock<IHubClients<IBookingClient>>();
        _mockCustomerGroup = new Mock<IBookingClient>();
        _mockProviderGroup = new Mock<IBookingClient>();
        _mockAdminGroup = new Mock<IBookingClient>();

        _mockHubContext.Setup(h => h.Clients).Returns(_mockClients.Object);

        _service = new BookingNotificationService(_mockHubContext.Object);
    }

    [Fact]
    public async Task NotifyBookingStatusChangedAsync_SendsStatusUpdateToCustomerAndProviderGroups()
    {
        // Arrange
        var bookingId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var status = BookingStatus.Accepted;
        var timestamp = DateTimeOffset.UtcNow;

        _mockClients.Setup(c => c.Group($"Customer_{customerId}")).Returns(_mockCustomerGroup.Object);
        _mockClients.Setup(c => c.Group($"Provider_{providerId}")).Returns(_mockProviderGroup.Object);
        _mockClients.Setup(c => c.Group("Admin")).Returns(_mockAdminGroup.Object);

        // Act
        await _service.NotifyBookingStatusChangedAsync(bookingId, customerId, providerId, status, timestamp);

        // Assert
        _mockCustomerGroup.Verify(
            c => c.ReceiveBookingStatusUpdate(bookingId, "Accepted", timestamp),
            Times.Once);
        _mockProviderGroup.Verify(
            c => c.ReceiveBookingStatusUpdate(bookingId, "Accepted", timestamp),
            Times.Once);
    }

    [Fact]
    public async Task NotifyBookingStatusChangedAsync_WhenStatusIsDisputed_SendsDisputeAlertToAllParties()
    {
        // Arrange
        var bookingId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var status = BookingStatus.Disputed;
        var timestamp = DateTimeOffset.UtcNow;

        _mockClients.Setup(c => c.Group($"Customer_{customerId}")).Returns(_mockCustomerGroup.Object);
        _mockClients.Setup(c => c.Group($"Provider_{providerId}")).Returns(_mockProviderGroup.Object);
        _mockClients.Setup(c => c.Group("Admin")).Returns(_mockAdminGroup.Object);

        // Act
        await _service.NotifyBookingStatusChangedAsync(bookingId, customerId, providerId, status, timestamp);

        // Assert
        _mockCustomerGroup.Verify(c => c.ReceiveDisputeAlert(bookingId, It.IsAny<string>()), Times.Once);
        _mockProviderGroup.Verify(c => c.ReceiveDisputeAlert(bookingId, It.IsAny<string>()), Times.Once);
        _mockAdminGroup.Verify(c => c.ReceiveDisputeAlert(bookingId, It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task NotifyJobDispatchedAsync_SendsReceiveNewJobDispatchToTargetProviderGroup()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        var jobRequestId = Guid.NewGuid();
        var category = "Electrical";
        var price = 5000m;

        _mockClients.Setup(c => c.Group($"Provider_{providerId}")).Returns(_mockProviderGroup.Object);

        // Act
        await _service.NotifyJobDispatchedAsync(providerId, bookingId, jobRequestId, category, price);

        // Assert
        _mockProviderGroup.Verify(
            c => c.ReceiveNewJobDispatch(bookingId, jobRequestId, category, price),
            Times.Once);
    }

    [Fact]
    public async Task NotifyScheduledBookingRequestedAsync_SendsReceiveScheduledBookingRequestToProviderGroup()
    {
        // Arrange
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        var category = "Carpentry";
        var scheduledAt = DateTimeOffset.UtcNow.AddDays(2);
        var price = 4500m;
        var remainingSeconds = 86400;

        _mockClients.Setup(c => c.Group($"Provider_{providerId}")).Returns(_mockProviderGroup.Object);

        // Act
        await _service.NotifyScheduledBookingRequestedAsync(
            providerId, bookingId, category, scheduledAt, price, remainingSeconds);

        // Assert
        _mockProviderGroup.Verify(
            c => c.ReceiveScheduledBookingRequest(bookingId, category, scheduledAt, price, remainingSeconds),
            Times.Once);
    }
}
