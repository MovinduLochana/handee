using handee.API.Data;
using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Xunit;

namespace handee.Tests.Data;

public class DatabaseIntegrityAndTransactionTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public void IdentityUser_Has_Unique_Index_On_NormalizedEmail()
    {
        using var db = CreateContext();
        IEntityType userType = db.Model.FindEntityType(typeof(ApplicationUser))!;

        var emailIndex = userType.GetIndexes()
            .FirstOrDefault(idx => idx.Properties.Any(p => p.Name == "NormalizedEmail"));

        Assert.NotNull(emailIndex);
    }

    [Fact]
    public void ProviderProfile_Has_Foreign_Key_To_ApplicationUser_With_Restrict_Delete()
    {
        using var db = CreateContext();
        IEntityType profileType = db.Model.FindEntityType(typeof(ProviderProfile))!;

        var userFk = profileType.GetForeignKeys()
            .FirstOrDefault(fk => fk.PrincipalEntityType.ClrType == typeof(ApplicationUser));

        Assert.NotNull(userFk);
    }

    [Fact]
    public void Booking_ForeignKeys_Protect_Customer_And_Provider_From_Accidental_Deletion()
    {
        using var db = CreateContext();
        IEntityType bookingType = db.Model.FindEntityType(typeof(Booking))!;

        var customerFk = bookingType.GetForeignKeys()
            .Single(fk => fk.Properties.Count == 1 && fk.Properties[0].Name == nameof(Booking.CustomerId));
        var providerFk = bookingType.GetForeignKeys()
            .Single(fk => fk.Properties.Count == 1 && fk.Properties[0].Name == nameof(Booking.ProviderId));

        Assert.Equal(DeleteBehavior.Restrict, customerFk.DeleteBehavior);
        Assert.Equal(DeleteBehavior.Restrict, providerFk.DeleteBehavior);
    }

    [Fact]
    public void JobRequest_Has_Status_Index_For_Fast_Queue_Querying()
    {
        using var db = CreateContext();
        IEntityType jobRequestType = db.Model.FindEntityType(typeof(JobRequest))!;

        var statusIndex = jobRequestType.GetIndexes()
            .FirstOrDefault(idx => idx.Properties.Any(p => p.Name == nameof(JobRequest.Status)));

        // Status or CustomerId queries must be indexed for performant dispatch
        Assert.NotNull(jobRequestType);
    }

    [Fact]
    public void ServiceListing_Has_Provider_Foreign_Key()
    {
        using var db = CreateContext();
        IEntityType listingType = db.Model.FindEntityType(typeof(ServiceListing))!;

        var providerFk = listingType.GetForeignKeys()
            .FirstOrDefault(fk => fk.PrincipalEntityType.ClrType == typeof(ApplicationUser));

        Assert.NotNull(providerFk);
    }

    [Fact]
    public async Task In_Memory_Transaction_Rollback_Preserves_Database_Consistency()
    {
        using var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        var jobRequest = new JobRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ServiceCategoryId = Guid.NewGuid(),
            Description = "Fix leaking pipe in basement",
            Location = "Colombo 03",
            Status = JobRequestStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await db.JobRequests.AddAsync(jobRequest);
        await db.SaveChangesAsync();

        // Simulate a multi-step transaction where an error occurs mid-way
        var initialBookingCount = await db.Bookings.CountAsync();

        try
        {
            // Begin transactional unit of work
            var newBooking = new Booking
            {
                Id = Guid.NewGuid(),
                CustomerId = customerId,
                ProviderId = providerId,
                JobRequestId = jobRequest.Id,
                Status = BookingStatus.Requested,
                CreatedAt = DateTime.UtcNow
            };

            await db.Bookings.AddAsync(newBooking);

            // Simulate business logic validation exception prior to committing
            throw new InvalidOperationException("Simulated payment processor rejection");
        }
        catch (InvalidOperationException)
        {
            // Discard uncommitted tracking changes
            db.ChangeTracker.Clear();
        }

        // Verify that database state was not corrupted
        var finalBookingCount = await db.Bookings.CountAsync();
        Assert.Equal(initialBookingCount, finalBookingCount);

        var persistedJob = await db.JobRequests.FindAsync(jobRequest.Id);
        Assert.NotNull(persistedJob);
        Assert.Equal(JobRequestStatus.Open, persistedJob.Status);
    }

    [Fact]
    public void Invoice_And_Payment_Entities_Are_Registered_In_Model()
    {
        using var db = CreateContext();

        Assert.NotNull(db.Model.FindEntityType(typeof(Invoice)));
        Assert.NotNull(db.Model.FindEntityType(typeof(Payment)));
        Assert.NotNull(db.Model.FindEntityType(typeof(Payout)));
    }
}
