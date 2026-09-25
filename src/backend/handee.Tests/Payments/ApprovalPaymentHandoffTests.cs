using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace handee.Tests.Payments;

public class ApprovalPaymentHandoffTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task MakeDecisionAsync_Approve_Triggers_InvoiceCreation_Handoff()
    {
        using var db = CreateContext();
        var mockHttpClientFactory = new Mock<IHttpClientFactory>();
        var mockInvoiceService = new Mock<IInvoiceService>();
        var mockLogger = new Mock<ILogger<AgentWorkflowService>>();

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
            WorkflowId = "wf-test-approve",
            Objective = "Repair desk",
            JobRequestId = jobRequest.Id,
            JobRequest = jobRequest,
            SelectedProviderId = providerId,
            ApprovalStatus = WorkflowApprovalStatus.Pending,
            EstimatedPrice = 7500m,
            ValidationTier = WorkflowValidationTier.RequiresHumanApproval
        };
        db.AgentWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var sut = new AgentWorkflowService(db, mockHttpClientFactory.Object, mockInvoiceService.Object, mockLogger.Object);

        var decisionDto = new AdminWorkflowDecisionDto("Approve", "Looks reasonable, approved.");
        var response = await sut.MakeDecisionAsync(workflow.Id, adminId, decisionDto);

        Assert.NotNull(response);
        Assert.Equal("approved", response.ApprovalStatus);

        // Verify that CreateInvoiceForBookingAsync was called with expected arguments
        mockInvoiceService.Verify(
            s => s.CreateInvoiceForBookingAsync(
                It.IsAny<Guid>(),
                customerId,
                providerId,
                7500m,
                QuoteApprovalStatus.Approved,
                "Carpentry",
                It.IsAny<CancellationToken>()
            ),
            Times.Once
        );

        // Verify booking was created in Requested status
        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.JobRequestId == jobRequest.Id);
        Assert.NotNull(booking);
        Assert.Equal(BookingStatus.Requested, booking.Status);
    }

    [Fact]
    public async Task MakeDecisionAsync_Reject_Does_Not_Trigger_InvoiceCreation()
    {
        using var db = CreateContext();
        var mockHttpClientFactory = new Mock<IHttpClientFactory>();
        var mockInvoiceService = new Mock<IInvoiceService>();
        var mockLogger = new Mock<ILogger<AgentWorkflowService>>();

        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        var jobRequest = new JobRequest
        {
            CustomerId = customerId,
            Description = "Fix plumbing issue",
            Status = JobRequestStatus.PendingAiReview,
            Location = "Colombo"
        };
        db.JobRequests.Add(jobRequest);

        var workflow = new AgentWorkflow
        {
            WorkflowId = "wf-test-reject",
            Objective = "Fix plumbing",
            JobRequestId = jobRequest.Id,
            JobRequest = jobRequest,
            SelectedProviderId = providerId,
            ApprovalStatus = WorkflowApprovalStatus.Pending,
            EstimatedPrice = 4000m
        };
        db.AgentWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var sut = new AgentWorkflowService(db, mockHttpClientFactory.Object, mockInvoiceService.Object, mockLogger.Object);

        var decisionDto = new AdminWorkflowDecisionDto("Reject", "Price estimate is out of normal range.");
        var response = await sut.MakeDecisionAsync(workflow.Id, adminId, decisionDto);

        Assert.NotNull(response);
        Assert.Equal("rejected", response.ApprovalStatus);

        // Verify that CreateInvoiceForBookingAsync was NEVER called
        mockInvoiceService.Verify(
            s => s.CreateInvoiceForBookingAsync(
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<decimal>(),
                It.IsAny<QuoteApprovalStatus>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()
            ),
            Times.Never
        );
    }
}
