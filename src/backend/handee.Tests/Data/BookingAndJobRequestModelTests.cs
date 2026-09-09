using handee.API.Data;
using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Xunit;

namespace handee.Tests.Data;

public class BookingAndJobRequestModelTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public void Model_Has_Booking_And_JobRequest_DbSets()
    {
        using var db = CreateContext();

        Assert.NotNull(db.Model.FindEntityType(typeof(Booking)));
        Assert.NotNull(db.Model.FindEntityType(typeof(JobRequest)));
    }

    [Fact]
    public void Booking_CustomerId_Uses_Restrict_On_Delete()
    {
        using var db = CreateContext();
        IEntityType bookingType = db.Model.FindEntityType(typeof(Booking))!;

        var customerFk = bookingType.GetForeignKeys()
            .Single(fk => fk.Properties.Count == 1
                && fk.Properties[0].Name == nameof(Booking.CustomerId));

        Assert.Equal(DeleteBehavior.Restrict, customerFk.DeleteBehavior);
    }

    [Fact]
    public void Booking_ProviderId_Uses_Restrict_On_Delete()
    {
        using var db = CreateContext();
        IEntityType bookingType = db.Model.FindEntityType(typeof(Booking))!;

        var providerFk = bookingType.GetForeignKeys()
            .Single(fk => fk.Properties.Count == 1
                && fk.Properties[0].Name == nameof(Booking.ProviderId));

        Assert.Equal(DeleteBehavior.Restrict, providerFk.DeleteBehavior);
    }

    [Fact]
    public void Booking_Has_Index_On_Status()
    {
        using var db = CreateContext();
        IEntityType bookingType = db.Model.FindEntityType(typeof(Booking))!;

        var hasStatusIndex = bookingType.GetIndexes()
            .Any(index => index.Properties.Count == 1
                && index.Properties[0].Name == nameof(Booking.Status));

        Assert.True(hasStatusIndex);
    }

    [Fact]
    public void JobRequest_Status_Defaults_To_PendingAiReview()
    {
        var jobRequest = new JobRequest();

        Assert.Equal(JobRequestStatus.PendingAiReview, jobRequest.Status);
    }
}
