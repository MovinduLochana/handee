using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.Bookings;

public class JobRequestServiceTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static CreateJobRequestDto SampleCreateDto() => new()
    {
        Category = "Plumbing",
        Description = "Leaking pipe under the sink.",
        PhotoUrls = ["https://example.com/photo1.jpg"],
        Location = "123 Main St",
        Urgency = JobUrgency.High,
        BudgetMin = 50m,
        BudgetMax = 150m
    };

    [Fact]
    public async Task CreateAsync_Persists_And_Returns_JobRequest_For_Given_Customer()
    {
        using var db = CreateContext();
        var sut = new JobRequestService(db);
        var customerId = Guid.NewGuid();

        var result = await sut.CreateAsync(customerId, SampleCreateDto());

        Assert.Equal(customerId, result.CustomerId);
        Assert.Equal("Plumbing", result.Category);
        Assert.Equal(JobRequestStatus.PendingAiReview.ToString(), result.Status);
        Assert.Single(db.JobRequests);
        Assert.Equal(customerId, db.JobRequests.Single().CustomerId);
    }

    [Fact]
    public async Task GetByIdAsync_Owner_Can_View()
    {
        using var db = CreateContext();
        var customerId = Guid.NewGuid();
        var jobRequest = new JobRequest
        {
            Category = "Electrical",
            Description = "Flickering lights.",
            Location = "456 Oak Ave",
            CustomerId = customerId
        };
        db.JobRequests.Add(jobRequest);
        await db.SaveChangesAsync();

        var sut = new JobRequestService(db);
        var result = await sut.GetByIdAsync(jobRequest.Id, customerId, isRequesterAdmin: false);

        Assert.NotNull(result);
        Assert.Equal(jobRequest.Id, result!.Id);
        Assert.Equal("Electrical", result.Category);
    }

    [Fact]
    public async Task GetByIdAsync_Admin_Can_View_Anyones_Request()
    {
        using var db = CreateContext();
        var jobRequest = new JobRequest
        {
            Category = "Electrical", Description = "d", Location = "l", CustomerId = Guid.NewGuid()
        };
        db.JobRequests.Add(jobRequest);
        await db.SaveChangesAsync();

        var sut = new JobRequestService(db);
        var result = await sut.GetByIdAsync(jobRequest.Id, Guid.NewGuid(), isRequesterAdmin: true);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetByIdAsync_NonOwner_NonAdmin_Gets_Null()
    {
        using var db = CreateContext();
        var jobRequest = new JobRequest
        {
            Category = "Electrical", Description = "d", Location = "l", CustomerId = Guid.NewGuid()
        };
        db.JobRequests.Add(jobRequest);
        await db.SaveChangesAsync();

        var sut = new JobRequestService(db);
        var result = await sut.GetByIdAsync(jobRequest.Id, Guid.NewGuid(), isRequesterAdmin: false);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByIdAsync_Returns_Null_When_Not_Found()
    {
        using var db = CreateContext();
        var sut = new JobRequestService(db);

        var result = await sut.GetByIdAsync(Guid.NewGuid(), Guid.NewGuid(), isRequesterAdmin: false);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetForCustomerAsync_Only_Returns_That_Customers_Requests()
    {
        using var db = CreateContext();
        var customerA = Guid.NewGuid();
        var customerB = Guid.NewGuid();

        db.JobRequests.AddRange(
            new JobRequest { Category = "A1", Description = "d", Location = "l", CustomerId = customerA },
            new JobRequest { Category = "A2", Description = "d", Location = "l", CustomerId = customerA },
            new JobRequest { Category = "B1", Description = "d", Location = "l", CustomerId = customerB });
        await db.SaveChangesAsync();

        var sut = new JobRequestService(db);
        var result = await sut.GetForCustomerAsync(customerA);

        Assert.Equal(2, result.Count);
        Assert.All(result, r => Assert.Equal(customerA, r.CustomerId));
        Assert.DoesNotContain(result, r => r.Category == "B1");
    }

    [Fact]
    public async Task GetForStaffAsync_Returns_Paged_Result_With_Correct_Total()
    {
        using var db = CreateContext();
        for (var i = 0; i < 5; i++)
        {
            db.JobRequests.Add(new JobRequest
            {
                Category = $"Cat{i}",
                Description = "d",
                Location = "l",
                CustomerId = Guid.NewGuid()
            });
        }
        await db.SaveChangesAsync();

        var sut = new JobRequestService(db);
        var result = await sut.GetForStaffAsync(
            status: null, urgency: null, sortDescending: true, page: 1, pageSize: 2);

        Assert.Equal(5, result.TotalCount);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(2, result.PageSize);
    }

    [Fact]
    public async Task GetForStaffAsync_Filters_By_Status_And_Urgency()
    {
        using var db = CreateContext();
        db.JobRequests.AddRange(
            new JobRequest
            {
                Category = "Match", Description = "d", Location = "l",
                CustomerId = Guid.NewGuid(), Status = JobRequestStatus.Open, Urgency = JobUrgency.High
            },
            new JobRequest
            {
                Category = "WrongStatus", Description = "d", Location = "l",
                CustomerId = Guid.NewGuid(), Status = JobRequestStatus.Cancelled, Urgency = JobUrgency.High
            },
            new JobRequest
            {
                Category = "WrongUrgency", Description = "d", Location = "l",
                CustomerId = Guid.NewGuid(), Status = JobRequestStatus.Open, Urgency = JobUrgency.Low
            });
        await db.SaveChangesAsync();

        var sut = new JobRequestService(db);
        var result = await sut.GetForStaffAsync(
            status: JobRequestStatus.Open, urgency: JobUrgency.High,
            sortDescending: true, page: 1, pageSize: 20);

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("Match", result.Items.Single().Category);
    }
}
