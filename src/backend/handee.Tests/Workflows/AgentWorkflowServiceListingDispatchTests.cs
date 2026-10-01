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

public class AgentWorkflowServiceListingDispatchTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task DispatchWorkflowAsync_WhenAgentReturnsSelectedServiceListing_BindsListingAndLocksPrice()
    {
        // Arrange
        using var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, UserName = "customer", FullName = "Nimal Customer", Email = "customer@handee.lk" };
        var provider = new ApplicationUser { Id = providerId, UserName = "provider", FullName = "Kamal Provider", Email = "provider@handee.lk" };
        db.Users.AddRange(customer, provider);

        var category = new ServiceCategory { Name = "Plumbing" };
        db.ServiceCategories.Add(category);

        var listing = new ServiceListing
        {
            ProviderId = providerId,
            ServiceCategoryId = category.Id,
            Title = "Pipe Repair & Unclogging",
            Description = "Comprehensive pipe repair",
            FixedPrice = 5500m,
            DurationHours = 2,
            IsActive = true
        };
        db.ServiceListings.Add(listing);

        var jobRequest = new JobRequest
        {
            CustomerId = customerId,
            ServiceCategoryId = category.Id,
            ServiceCategory = category,
            Description = "Severe pipe leak in bathroom",
            Status = JobRequestStatus.PendingAiReview,
            Location = "Colombo"
        };
        db.JobRequests.Add(jobRequest);
        await db.SaveChangesAsync();

        var agentResponse = new
        {
            workflow_id = "wf-instant-match-1",
            objective = "Severe pipe leak in bathroom",
            validation_tier = "approved_for_auto_dispatch",
            approval_status = "approved",
            estimated_price = 5500,
            selected_provider_id = providerId.ToString(),
            selected_service_listing_id = listing.Id.ToString(),
            plan = new[] { "Step 1: Domain Analysis", "Step 2: Match Listing", "Step 3: Auto-dispatch" }
        };

        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(agentResponse))
            });

        var client = new HttpClient(mockHandler.Object) { BaseAddress = new Uri("http://localhost:8000") };
        var mockHttpClientFactory = new Mock<IHttpClientFactory>();
        mockHttpClientFactory.Setup(f => f.CreateClient("AgentService")).Returns(client);

        var mockInvoiceService = new Mock<IInvoiceService>();
        var mockLogger = new Mock<ILogger<AgentWorkflowService>>();
        var mockAvailabilityService = new Mock<IProviderAvailabilityService>();

        var tomorrowDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var expectedSlotTime = new DateTimeOffset(DateTime.UtcNow.Year, DateTime.UtcNow.Month, DateTime.UtcNow.Day, 10, 0, 0, TimeSpan.Zero).AddDays(1);
        mockAvailabilityService.Setup(a => a.GetPredefinedSlotsForDateAsync(providerId, tomorrowDate, 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DailySlotsResponseDto(
                providerId,
                tomorrowDate,
                2,
                true,
                new List<PredefinedSlotDto>
                {
                    new("10:00", "10:00 AM", expectedSlotTime, expectedSlotTime.AddHours(2), true, null)
                }
            ));

        var sut = new AgentWorkflowService(
            db,
            mockHttpClientFactory.Object,
            mockInvoiceService.Object,
            mockLogger.Object,
            null,
            mockAvailabilityService.Object);

        // Act
        var workflow = await sut.DispatchWorkflowAsync(jobRequest);

        // Assert
        Assert.NotNull(workflow);
        Assert.Equal(listing.Id, workflow.SelectedServiceListingId);
        Assert.Equal(5500m, workflow.EstimatedPrice);
        Assert.Equal(providerId, workflow.SelectedProviderId);

        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.JobRequestId == jobRequest.Id);
        Assert.NotNull(booking);
        Assert.Equal(listing.Id, booking.ServiceListingId);
        Assert.Equal(providerId, booking.ProviderId);
        Assert.Equal(customerId, booking.CustomerId);
        Assert.NotNull(booking.ScheduledAt);
        Assert.Equal(expectedSlotTime, booking.ScheduledAt);
        Assert.Equal(0, booking.ScheduledAt.Value.Minute);
        Assert.Equal(0, booking.ScheduledAt.Value.Second);
    }

    [Fact]
    public async Task MakeDecisionAsync_WhenApproved_AssignsSelectedServiceListingAndOperatingSlot()
    {
        // Arrange
        using var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, UserName = "cust2", FullName = "Sunil Customer", Email = "cust2@handee.lk" };
        var provider = new ApplicationUser { Id = providerId, UserName = "prov2", FullName = "Nimal Provider", Email = "prov2@handee.lk" };
        db.Users.AddRange(customer, provider);

        var category = new ServiceCategory { Name = "Electrical" };
        db.ServiceCategories.Add(category);

        var listing = new ServiceListing
        {
            ProviderId = providerId,
            ServiceCategoryId = category.Id,
            Title = "Rewiring & Inspection",
            FixedPrice = 8000m,
            DurationHours = 3,
            IsActive = true
        };
        db.ServiceListings.Add(listing);

        var jobRequest = new JobRequest
        {
            CustomerId = customerId,
            ServiceCategoryId = category.Id,
            ServiceCategory = category,
            Description = "Main fuse tripping constantly",
            Status = JobRequestStatus.PendingAiReview,
            Location = "Kandy"
        };
        db.JobRequests.Add(jobRequest);

        var workflow = new AgentWorkflow
        {
            WorkflowId = "wf-hitl-1",
            Objective = "Main fuse tripping constantly",
            JobRequestId = jobRequest.Id,
            JobRequest = jobRequest,
            SelectedProviderId = providerId,
            SelectedServiceListingId = listing.Id,
            ApprovalStatus = WorkflowApprovalStatus.Pending,
            EstimatedPrice = 8000m,
            ValidationTier = WorkflowValidationTier.RequiresHumanApproval
        };
        db.AgentWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var mockHttpClientFactory = new Mock<IHttpClientFactory>();
        var mockInvoiceService = new Mock<IInvoiceService>();
        var mockLogger = new Mock<ILogger<AgentWorkflowService>>();
        var mockAvailabilityService = new Mock<IProviderAvailabilityService>();

        var tomorrowDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var slotStart = new DateTimeOffset(DateTime.UtcNow.Year, DateTime.UtcNow.Month, DateTime.UtcNow.Day, 14, 0, 0, TimeSpan.Zero).AddDays(1);
        mockAvailabilityService.Setup(a => a.GetPredefinedSlotsForDateAsync(providerId, tomorrowDate, 3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DailySlotsResponseDto(
                providerId,
                tomorrowDate,
                3,
                true,
                new List<PredefinedSlotDto>
                {
                    new("14:00", "02:00 PM", slotStart, slotStart.AddHours(3), true, null)
                }
            ));

        var sut = new AgentWorkflowService(
            db,
            mockHttpClientFactory.Object,
            mockInvoiceService.Object,
            mockLogger.Object,
            null,
            mockAvailabilityService.Object);

        // Act
        var result = await sut.MakeDecisionAsync(workflow.Id, adminId, new AdminWorkflowDecisionDto("Approve", "Approved by admin"));

        // Assert
        Assert.NotNull(result);
        Assert.Equal("approved", result.ApprovalStatus);
        Assert.Equal(listing.Id, result.SelectedServiceListingId);

        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.JobRequestId == jobRequest.Id);
        Assert.NotNull(booking);
        Assert.Equal(listing.Id, booking.ServiceListingId);
        Assert.Equal(slotStart, booking.ScheduledAt);
    }
}
