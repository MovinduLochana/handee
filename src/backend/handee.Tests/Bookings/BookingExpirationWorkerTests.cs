using handee.API.Interfaces;
using handee.API.Workers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace handee.Tests.Bookings;

public class BookingExpirationWorkerTests
{
    [Fact]
    public async Task Worker_ExecutesProcessExpiredBookingsAsync_AndStopsGracefullyOnCancellation()
    {
        // Arrange
        var expirationServiceMock = new Mock<IBookingExpirationService>();
        var tcs = new TaskCompletionSource<bool>();

        expirationServiceMock
            .Setup(s => s.ProcessExpiredBookingsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1)
            .Callback(() => tcs.TrySetResult(true));

        var serviceProviderMock = new Mock<IServiceProvider>();
        serviceProviderMock
            .Setup(sp => sp.GetService(typeof(IBookingExpirationService)))
            .Returns(expirationServiceMock.Object);

        var scopeMock = new Mock<IServiceScope>();
        scopeMock.Setup(s => s.ServiceProvider).Returns(serviceProviderMock.Object);

        var scopeFactoryMock = new Mock<IServiceScopeFactory>();
        scopeFactoryMock.Setup(f => f.CreateScope()).Returns(scopeMock.Object);

        var loggerMock = new Mock<ILogger<BookingExpirationWorker>>();

        using var cts = new CancellationTokenSource();
        var worker = new BookingExpirationWorker(
            scopeFactoryMock.Object,
            loggerMock.Object,
            checkInterval: TimeSpan.FromMilliseconds(50));

        // Act
        var executeTask = worker.StartAsync(cts.Token);

        // Wait until at least one execution runs
        var executed = await Task.WhenAny(tcs.Task, Task.Delay(2000));
        Assert.Same(tcs.Task, executed);

        // Cancel and stop
        await cts.CancelAsync();
        await worker.StopAsync(CancellationToken.None);

        // Assert
        expirationServiceMock.Verify(s => s.ProcessExpiredBookingsAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce());
    }
}
