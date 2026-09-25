using System.Net;
using System.Text.Json;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using Xunit;

namespace handee.Tests.Workflows;

public class AgentWorkflowDispatchNotificationTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task MakeDecisionAsync_WhenApproved_Emits_JobDispatch_Notification_To_Provider()
    {
        // Arrange
        using var db = CreateContext();
        var mockHttpClientFactory = new Mock<IHttpClientFactory>();
        var mockInvoiceService = new Mock<IInvoiceService>();
        var mockLogger = new Mock<ILogger<AgentWorkflowService>>();
        var mockNotificationService = new Mock<IBookingNotificationService>();

        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        var category = new ServiceCategory { Name = "Carpentry" };
        db.ServiceCategories.Add(category);

        var jobRequest = new JobRequest
        {
            CustomerId = customerId,
            ServiceCategoryId = category.Id,
            ServiceCategory = category,
            Description = "Repair wooden desk",
            Status = JobRequestStatus.PendingAiReview,
            Location = "Colombo"
        };
        db.JobRequests.Add(jobRequest);

        var workflow = new AgentWorkflow
        {
            WorkflowId = "wf-test-dispatch",
            Objective = "Repair desk",
            JobRequestId = jobRequest.Id,
            JobRequest = jobRequest,
            SelectedProviderId = providerId,
            ApprovalStatus = "pending",
            EstimatedPrice = 7500m,
            ValidationTier = "human_approval_required"
        };
        db.AgentWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var sut = new AgentWorkflowService(
            db,
            mockHttpClientFactory.Object,
            mockInvoiceService.Object,
            mockLogger.Object,
            mockNotificationService.Object);

        // Act
        await sut.MakeDecisionAsync(
            workflow.Id,
            adminId,
            new AdminWorkflowDecisionDto("Approve", "Looks good"));

        // Assert
        mockNotificationService.Verify(
            n => n.NotifyJobDispatchedAsync(
                providerId,
                It.IsAny<Guid>(),
                jobRequest.Id,
                "Carpentry",
                7500m,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DispatchWorkflowAsync_WhenAutoDispatched_Emits_JobDispatch_Notification_To_Provider()
    {
        // Arrange
        using var db = CreateContext();
        var mockHttpClientFactory = new Mock<IHttpClientFactory>();
        var mockInvoiceService = new Mock<IInvoiceService>();
        var mockLogger = new Mock<ILogger<AgentWorkflowService>>();
        var mockNotificationService = new Mock<IBookingNotificationService>();

        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Customer" };
        var provider = new ApplicationUser { Id = providerId, FullName = "Provider" };
        db.Users.AddRange(customer, provider);

        var profile = new ProviderProfile
        {
            UserId = providerId,
            VerificationStatus = VerificationStatus.Verified
        };
        db.ProviderProfiles.Add(profile);

        var category = new ServiceCategory { Name = "Plumbing" };
        db.ServiceCategories.Add(category);

        var jobRequest = new JobRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            Customer = customer,
            ServiceCategoryId = category.Id,
            ServiceCategory = category,
            Description = "Leaking pipe",
            Urgency = JobUrgency.Medium,
            BudgetMin = 3000m,
            BudgetMax = 6000m,
            Location = "Kandy"
        };
        db.JobRequests.Add(jobRequest);
        await db.SaveChangesAsync();

        // Setup mock HttpClient returning auto_dispatch response
        var responsePayload = new
        {
            workflow_id = "wf-auto",
            selected_provider_id = providerId.ToString(),
            validation_tier = "approved_for_auto_dispatch",
            approval_status = "approved",
            estimated_price = 4500m,
            confidence_score = 0.95
        };
        var responseJson = JsonSerializer.Serialize(responsePayload);
        var mockHttpMessageHandler = new Mock<HttpMessageHandler>();
        mockHttpMessageHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(responseJson, System.Text.Encoding.UTF8, "application/json")
            });

        var httpClient = new HttpClient(mockHttpMessageHandler.Object)
        {
            BaseAddress = new Uri("http://localhost:8000")
        };
        mockHttpClientFactory.Setup(f => f.CreateClient("AgentService")).Returns(httpClient);

        var sut = new AgentWorkflowService(
            db,
            mockHttpClientFactory.Object,
            mockInvoiceService.Object,
            mockLogger.Object,
            mockNotificationService.Object);

        // Act
        var result = await sut.DispatchWorkflowAsync(jobRequest);

        // Assert
        Assert.NotNull(result);
        mockNotificationService.Verify(
            n => n.NotifyJobDispatchedAsync(
                providerId,
                It.IsAny<Guid>(),
                jobRequest.Id,
                "Plumbing",
                4500m,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
