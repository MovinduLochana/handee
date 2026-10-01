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
    public async Task GetOperatingSchedule_ReturnsOkWithSchedule()
    {
        var providerId = Guid.NewGuid();
        var controller = CreateController();
        var schedule = new ProviderOperatingScheduleDto(providerId, new List<DayOperatingScheduleDto>());

        _serviceMock.Setup(s => s.GetOperatingScheduleAsync(providerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(schedule);

        var result = await controller.GetOperatingSchedule(providerId, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(schedule, ok.Value);
    }

    [Fact]
    public async Task UpdateOperatingSchedule_ValidDto_ReturnsOkWithUpdatedSchedule()
    {
        var providerId = Guid.NewGuid();
        var controller = CreateController(providerId);
        var dto = new UpdateOperatingScheduleDto(new List<DayOperatingScheduleDto>());
        var schedule = new ProviderOperatingScheduleDto(providerId, new List<DayOperatingScheduleDto>());

        _serviceMock.Setup(s => s.UpdateOperatingScheduleAsync(providerId, dto, It.IsAny<CancellationToken>()))
            .ReturnsAsync(schedule);

        var result = await controller.UpdateOperatingSchedule(dto, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(schedule, ok.Value);
    }

    [Fact]
    public async Task UpdateOperatingSchedule_Unauthenticated_ReturnsUnauthorized()
    {
        var controller = CreateController(providerId: null);
        var dto = new UpdateOperatingScheduleDto(new List<DayOperatingScheduleDto>());

        var result = await controller.UpdateOperatingSchedule(dto, CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task UpdateOperatingSchedule_ValidationException_ReturnsBadRequest()
    {
        var providerId = Guid.NewGuid();
        var controller = CreateController(providerId);
        var dto = new UpdateOperatingScheduleDto(new List<DayOperatingScheduleDto>());

        _serviceMock.Setup(s => s.UpdateOperatingScheduleAsync(providerId, dto, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ValidationException("Weekly schedule cannot be empty."));

        var result = await controller.UpdateOperatingSchedule(dto, CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Weekly schedule cannot be empty.", badRequest.Value);
    }

    [Fact]
    public async Task GetPredefinedSlots_ReturnsOkWithDailySlots()
    {
        var providerId = Guid.NewGuid();
        var date = new DateOnly(2026, 10, 15);
        var controller = CreateController();
        var response = new DailySlotsResponseDto(providerId, date, 1, true, new List<PredefinedSlotDto>());

        _serviceMock.Setup(s => s.GetPredefinedSlotsForDateAsync(providerId, date, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);

        var result = await controller.GetPredefinedSlots(providerId, date, 1, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(response, ok.Value);
    }
}
