using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace handee.Tests.Bookings;

public class JobRequestServiceTests
{
    private static JobRequestService CreateSut(AppDbContext db) => new(db, new Mock<IAgentWorkflowService>().Object);

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<ServiceCategory> SeedCategoryAsync(AppDbContext db, string name = "Plumbing")
    {
        var category = new ServiceCategory { Name = name };
        db.ServiceCategories.Add(category);
        await db.SaveChangesAsync();
        return category;
    }

    private static CreateJobRequestDto SampleCreateDto(Guid serviceCategoryId) => new()
    {
        ServiceCategoryId = serviceCategoryId,
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
        var category = await SeedCategoryAsync(db);
        var sut = CreateSut(db);
        var customerId = Guid.NewGuid();

        var result = await sut.CreateAsync(customerId, SampleCreateDto(category.Id));

        Assert.Equal(customerId, result.CustomerId);
        Assert.Equal(category.Id, result.ServiceCategoryId);
        Assert.Equal(category.Name, result.CategoryName);
        Assert.Equal(JobRequestStatus.PendingAiReview.ToString(), result.Status);
        Assert.Single(db.JobRequests);
        Assert.Equal(customerId, db.JobRequests.Single().CustomerId);
    }

    [Fact]
    public async Task CreateAsync_Throws_NotFound_When_ServiceCategoryId_Invalid()
    {
        using var db = CreateContext();
        var sut = CreateSut(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            sut.CreateAsync(Guid.NewGuid(), SampleCreateDto(Guid.NewGuid())));
    }

    [Fact]
    public async Task GetByIdAsync_Owner_Can_View()
    {
        using var db = CreateContext();
        var category = await SeedCategoryAsync(db, "Electrical");
        var customerId = Guid.NewGuid();
        var jobRequest = new JobRequest
        {
            ServiceCategoryId = category.Id,
            Description = "Flickering lights.",
            Location = "456 Oak Ave",
            CustomerId = customerId
        };
        db.JobRequests.Add(jobRequest);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.GetByIdAsync(jobRequest.Id, customerId, isRequesterAdmin: false);

        Assert.NotNull(result);
        Assert.Equal(jobRequest.Id, result!.Id);
        Assert.Equal("Electrical", result.CategoryName);
    }

    [Fact]
    public async Task GetByIdAsync_Admin_Can_View_Anyones_Request()
    {
        using var db = CreateContext();
        var category = await SeedCategoryAsync(db);
        var jobRequest = new JobRequest
        {
            ServiceCategoryId = category.Id, Description = "d", Location = "l", CustomerId = Guid.NewGuid()
        };
        db.JobRequests.Add(jobRequest);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.GetByIdAsync(jobRequest.Id, Guid.NewGuid(), isRequesterAdmin: true);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetByIdAsync_NonOwner_NonAdmin_Gets_Null()
    {
        using var db = CreateContext();
        var category = await SeedCategoryAsync(db);
        var jobRequest = new JobRequest
        {
            ServiceCategoryId = category.Id, Description = "d", Location = "l", CustomerId = Guid.NewGuid()
        };
        db.JobRequests.Add(jobRequest);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.GetByIdAsync(jobRequest.Id, Guid.NewGuid(), isRequesterAdmin: false);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByIdAsync_Returns_Null_When_Not_Found()
    {
        using var db = CreateContext();
        var sut = CreateSut(db);

        var result = await sut.GetByIdAsync(Guid.NewGuid(), Guid.NewGuid(), isRequesterAdmin: false);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetForCustomerAsync_Only_Returns_That_Customers_Requests()
    {
        using var db = CreateContext();
        var category = await SeedCategoryAsync(db);
        var customerA = Guid.NewGuid();
        var customerB = Guid.NewGuid();

        db.JobRequests.AddRange(
            new JobRequest { ServiceCategoryId = category.Id, Description = "d", Location = "l", CustomerId = customerA },
            new JobRequest { ServiceCategoryId = category.Id, Description = "d", Location = "l", CustomerId = customerA },
            new JobRequest { ServiceCategoryId = category.Id, Description = "d", Location = "l", CustomerId = customerB });
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.GetForCustomerAsync(customerA);

        Assert.Equal(2, result.Count);
        Assert.All(result, r => Assert.Equal(customerA, r.CustomerId));
        Assert.DoesNotContain(result, r => r.CustomerId == customerB);
    }

    [Fact]
    public async Task GetForStaffAsync_Returns_Paged_Result_With_Correct_Total()
    {
        using var db = CreateContext();
        var category = await SeedCategoryAsync(db);
        for (var i = 0; i < 5; i++)
        {
            db.JobRequests.Add(new JobRequest
            {
                ServiceCategoryId = category.Id,
                Description = "d",
                Location = "l",
                CustomerId = Guid.NewGuid()
            });
        }
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
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
        var category = await SeedCategoryAsync(db);
        db.JobRequests.AddRange(
            new JobRequest
            {
                ServiceCategoryId = category.Id, Description = "d", Location = "l",
                CustomerId = Guid.NewGuid(), Status = JobRequestStatus.Open, Urgency = JobUrgency.High
            },
            new JobRequest
            {
                ServiceCategoryId = category.Id, Description = "d", Location = "l",
                CustomerId = Guid.NewGuid(), Status = JobRequestStatus.Cancelled, Urgency = JobUrgency.High
            },
            new JobRequest
            {
                ServiceCategoryId = category.Id, Description = "d", Location = "l",
                CustomerId = Guid.NewGuid(), Status = JobRequestStatus.Open, Urgency = JobUrgency.Low
            });
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.GetForStaffAsync(
            status: JobRequestStatus.Open, urgency: JobUrgency.High,
            sortDescending: true, page: 1, pageSize: 20);

        Assert.Equal(1, result.TotalCount);
        Assert.Equal(category.Name, result.Items.Single().CategoryName);
    }
}
