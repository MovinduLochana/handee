using System.Security.Claims;
using handee.API.Controllers;
using handee.API.DTO;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace handee.Tests.Workflows;

public class JobRequestControllerWorkflowTests
{
    private static (JobRequestController Controller, Mock<IJobRequestService> MockJobService, Mock<IAgentWorkflowService> MockWorkflowService)
        CreateController(Guid? userId = null, string role = "Customer")
    {
        var mockJobService = new Mock<IJobRequestService>();
        var mockWorkflowService = new Mock<IAgentWorkflowService>();
        var controller = new JobRequestController(mockJobService.Object, mockWorkflowService.Object);

        if (userId.HasValue)
        {
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()),
                new Claim(ClaimTypes.Role, role)
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

        return (controller, mockJobService, mockWorkflowService);
    }

    [Fact]
    public async Task GetWorkflow_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        var (controller, _, _) = CreateController(userId: null);
        var result = await controller.GetWorkflow(Guid.NewGuid(), CancellationToken.None);
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GetWorkflow_WhenJobNotFound_ReturnsNotFound()
    {
        var customerId = Guid.NewGuid();
        var jobId = Guid.NewGuid();
        var (controller, mockJobService, _) = CreateController(userId: customerId);

        mockJobService.Setup(s => s.GetByIdAsync(jobId, customerId, false))
            .ReturnsAsync((JobRequestResponseDto?)null);

        var result = await controller.GetWorkflow(jobId, CancellationToken.None);
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetWorkflow_WhenWorkflowNotFound_ReturnsNotFound()
    {
        var customerId = Guid.NewGuid();
        var jobId = Guid.NewGuid();
        var (controller, mockJobService, mockWorkflowService) = CreateController(userId: customerId);

        var jobDto = new JobRequestResponseDto(
            jobId, Guid.NewGuid(), "Plumbing", "Leaking sink", new List<string>(),
            "Colombo", "Medium", 3000m, 5000m, "PendingAiReview", customerId,
            DateTimeOffset.UtcNow, null);

        mockJobService.Setup(s => s.GetByIdAsync(jobId, customerId, false))
            .ReturnsAsync(jobDto);

        mockWorkflowService.Setup(s => s.GetByJobRequestIdAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AgentWorkflowResponseDto?)null);

        var result = await controller.GetWorkflow(jobId, CancellationToken.None);
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetWorkflow_WhenFound_ReturnsOkWithWorkflowDto()
    {
        var customerId = Guid.NewGuid();
        var jobId = Guid.NewGuid();
        var (controller, mockJobService, mockWorkflowService) = CreateController(userId: customerId);

        var jobDto = new JobRequestResponseDto(
            jobId, Guid.NewGuid(), "Plumbing", "Leaking sink", new List<string>(),
            "Colombo", "Medium", 3000m, 5000m, "Open", customerId,
            DateTimeOffset.UtcNow, null);

        mockJobService.Setup(s => s.GetByIdAsync(jobId, customerId, false))
            .ReturnsAsync(jobDto);

        var workflowDto = new AgentWorkflowResponseDto(
            Guid.NewGuid(), jobId, "wf-123", "Leaking sink", new List<string> { "Step 1", "Step 2" },
            "ApprovedForAutoDispatch", "Approved", 4200m, Guid.NewGuid(), "Sunil Perera",
            "{}", null, null, DateTimeOffset.UtcNow, new List<AgentStepLogDto>());

        mockWorkflowService.Setup(s => s.GetByJobRequestIdAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflowDto);

        var result = await controller.GetWorkflow(jobId, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnedDto = Assert.IsType<AgentWorkflowResponseDto>(okResult.Value);
        Assert.Equal("wf-123", returnedDto.WorkflowId);
        Assert.Equal(4200m, returnedDto.EstimatedPrice);
    }
}
