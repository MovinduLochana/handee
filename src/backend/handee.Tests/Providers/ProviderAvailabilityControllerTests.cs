using System.Security.Claims;
using handee.API.Controllers;
using handee.API.DTO;
using handee.API.Exceptions;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace handee.Tests.Providers;

public class ProviderAvailabilityControllerTests
{
    private readonly Mock<IProviderAvailabilityService> _serviceMock = new();

    private ProviderAvailabilityController CreateController(Guid? providerId = null)
    {
        var controller = new ProviderAvailabilityController(_serviceMock.Object);

        var claims = new List<Claim> { new(ClaimTypes.Role, "Provider") };
        if (providerId.HasValue)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, providerId.Value.ToString()));
        }

        var identity = new ClaimsIdentity(claims, providerId.HasValue ? "TestAuth" : null);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        return controller;
    }

    [Fact]
    public async Task Create_MissingUserId_ReturnsUnauthorized()
    {
        var controller = CreateController(providerId: null);
        var result = await controller.Create(new CreateSlotDto());

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task CreateBatch_Success_Returns201Created()
    {
        var providerId = Guid.NewGuid();
        var controller = CreateController(providerId);
        var dto = new BatchCreateSlotsDto
        {
            Slots = new List<CreateSlotDto>
            {
                new() { StartTime = DateTimeOffset.UtcNow.AddDays(1), EndTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1) }
            }
        };

        var expectedResult = new List<SlotResponseDto>
        {
            new(Guid.NewGuid(), providerId, dto.Slots[0].StartTime, dto.Slots[0].EndTime, false, DateTimeOffset.UtcNow, null)
        };

        _serviceMock.Setup(s => s.CreateBatchSlotsAsync(providerId, dto))
            .ReturnsAsync(expectedResult);

        var result = await controller.CreateBatch(dto);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, statusResult.StatusCode);
        Assert.Equal(expectedResult, statusResult.Value);
    }

    [Fact]
    public async Task CreateRecurring_Success_Returns201Created()
    {
        var providerId = Guid.NewGuid();
        var controller = CreateController(providerId);
        var dto = new RecurringScheduleDto
        {
            DaysOfWeek = new List<DayOfWeek> { DayOfWeek.Monday },
            DailyStartTime = TimeSpan.FromHours(9),
            DailyEndTime = TimeSpan.FromHours(17),
            SlotDurationMinutes = 60,
            StartDate = DateTimeOffset.UtcNow.AddDays(1),
            EndDate = DateTimeOffset.UtcNow.AddDays(8)
        };

        var expectedResult = new List<SlotResponseDto>
        {
            new(Guid.NewGuid(), providerId, dto.StartDate, dto.StartDate.AddHours(1), false, DateTimeOffset.UtcNow, null)
        };

        _serviceMock.Setup(s => s.CreateRecurringSlotsAsync(providerId, dto))
            .ReturnsAsync(expectedResult);

        var result = await controller.CreateRecurring(dto);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, statusResult.StatusCode);
        Assert.Equal(expectedResult, statusResult.Value);
    }

    [Fact]
    public async Task GetForProvider_PassesRangeParameters_ReturnsOk()
    {
        var controller = CreateController(providerId: null);
        var targetProviderId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow.AddDays(1);
        var end = DateTimeOffset.UtcNow.AddDays(7);

        var slots = new List<SlotResponseDto>
        {
            new(Guid.NewGuid(), targetProviderId, start, start.AddHours(1), false, DateTimeOffset.UtcNow, null)
        };

        _serviceMock.Setup(s => s.GetForProviderAsync(targetProviderId, start, end))
            .ReturnsAsync(slots);

        var result = await controller.GetForProvider(targetProviderId, start, end);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(slots, okResult.Value);
    }

    [Fact]
    public async Task Delete_NotFound_ReturnsNotFound()
    {
        var providerId = Guid.NewGuid();
        var slotId = Guid.NewGuid();
        var controller = CreateController(providerId);

        _serviceMock.Setup(s => s.DeleteSlotAsync(slotId, providerId))
            .ThrowsAsync(new NotFoundException("Slot not found."));

        var result = await controller.Delete(slotId);

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal("Slot not found.", notFoundResult.Value);
    }

    [Fact]
    public async Task Delete_Success_ReturnsNoContent()
    {
        var providerId = Guid.NewGuid();
        var slotId = Guid.NewGuid();
        var controller = CreateController(providerId);

        _serviceMock.Setup(s => s.DeleteSlotAsync(slotId, providerId))
            .Returns(Task.CompletedTask);

        var result = await controller.Delete(slotId);

        Assert.IsType<NoContentResult>(result);
    }
}
