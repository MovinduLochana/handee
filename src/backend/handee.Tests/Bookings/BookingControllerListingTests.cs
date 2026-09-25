using System.Security.Claims;
using handee.API.Controllers;
using handee.API.DTO;
using handee.API.DTO.ServiceListing;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace handee.Tests.Bookings;

public class BookingControllerListingTests
{
    private static (BookingController Controller, Mock<IBookingService> MockService) CreateBookingController(Guid? userId = null)
    {
        var mockService = new Mock<IBookingService>();
        var controller = new BookingController(mockService.Object);

        if (userId.HasValue)
        {
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()),
                new Claim(ClaimTypes.Role, "Customer")
            }, "TestAuth"));

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }
        else
        {
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
        }

        return (controller, mockService);
    }

    [Fact]
    public async Task CreateBookingFromListing_Unauthenticated_ReturnsUnauthorized()
    {
        var (controller, _) = CreateBookingController(userId: null);
        var dto = new CreateListingBookingDto(Guid.NewGuid(), DateTimeOffset.UtcNow.AddDays(1));

        var result = await controller.CreateBookingFromListing(dto);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task CreateBookingFromListing_Success_ReturnsCreatedAtAction()
    {
        var customerId = Guid.NewGuid();
        var (controller, mockService) = CreateBookingController(customerId);

        var listingId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();
        var scheduledAt = DateTimeOffset.UtcNow.AddDays(1);
        var dto = new CreateListingBookingDto(listingId, scheduledAt, "Urgent repair");

        var expectedResponse = new BookingResponseDto(
            bookingId,
            null,
            listingId,
            Guid.NewGuid(),
            customerId,
            BookingStatus.Requested.ToString(),
            scheduledAt,
            DateTimeOffset.UtcNow,
            null,
            Notes: "Urgent repair"
        );

        mockService.Setup(s => s.CreateFromListingAsync(dto, customerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        var result = await controller.CreateBookingFromListing(dto);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(BookingController.GetById), created.ActionName);
        Assert.Equal(bookingId, created.RouteValues?["id"]);
        Assert.Equal(expectedResponse, created.Value);
    }

    [Fact]
    public async Task CreateBookingFromListing_NotFound_ReturnsNotFound()
    {
        var customerId = Guid.NewGuid();
        var (controller, mockService) = CreateBookingController(customerId);

        var dto = new CreateListingBookingDto(Guid.NewGuid(), DateTimeOffset.UtcNow.AddDays(1));

        mockService.Setup(s => s.CreateFromListingAsync(dto, customerId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new NotFoundException("Listing not found"));

        var result = await controller.CreateBookingFromListing(dto);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task CreateBookingFromListing_Conflict_ReturnsBadRequest()
    {
        var customerId = Guid.NewGuid();
        var (controller, mockService) = CreateBookingController(customerId);

        var dto = new CreateListingBookingDto(Guid.NewGuid(), DateTimeOffset.UtcNow.AddDays(1));

        mockService.Setup(s => s.CreateFromListingAsync(dto, customerId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ValidationException("Provider already has an active booking"));

        var result = await controller.CreateBookingFromListing(dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequest.Value);
    }
}
