using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.Payments;

public class InvoiceServiceTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<(AppDbContext Db, Booking Booking, Guid CustomerId, Guid ProviderId)> SeedBookingAsync()
    {
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Test Customer", Email = "customer@test.com" };
        var provider = new ApplicationUser { Id = providerId, FullName = "Test Provider", Email = "provider@test.com" };
        db.Users.AddRange(customer, provider);

        var booking = new Booking
        {
            CustomerId = customerId,
            ProviderId = providerId,
            Status = BookingStatus.Completed
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        return (db, booking, customerId, providerId);
    }

    [Fact]
    public async Task CreateInvoiceAsync_Calculates_Fee_And_Total_Correctly()
    {
        var test = await SeedBookingAsync();
        using var db = test.Db;
        var sut = new InvoiceService(test.Db);

        var dto = new CreateInvoiceDto(test.Booking.Id, 5000m, "{\"item\": \"AC Service\"}");
        var result = await sut.CreateInvoiceAsync(dto, test.ProviderId);

        Assert.NotNull(result);
        Assert.Equal(5000m, result.BaseAmount);
        Assert.Equal(750m, result.PlatformFee); // 15% of 5000
        Assert.Equal(5750m, result.TotalAmount);
        Assert.Equal(InvoiceStatus.Issued.ToString(), result.Status);
        Assert.Equal("LKR", result.Currency);
    }

    [Fact]
    public async Task CreateInvoiceAsync_Returns_Existing_If_Already_Created()
    {
        var test = await SeedBookingAsync();
        using var db = test.Db;
        var sut = new InvoiceService(test.Db);

        var dto = new CreateInvoiceDto(test.Booking.Id, 4000m);
        var first = await sut.CreateInvoiceAsync(dto, test.ProviderId);
        var second = await sut.CreateInvoiceAsync(dto, test.ProviderId);

        Assert.Equal(first.Id, second.Id);
        Assert.Single(test.Db.Invoices);
    }

    [Fact]
    public async Task CreateInvoiceAsync_Throws_When_Unauthorized_Party()
    {
        var test = await SeedBookingAsync();
        using var db = test.Db;
        var sut = new InvoiceService(test.Db);

        var dto = new CreateInvoiceDto(test.Booking.Id, 3000m);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            sut.CreateInvoiceAsync(dto, Guid.NewGuid()));
    }

    [Fact]
    public async Task GetCustomerInvoicesAsync_Returns_Only_Customer_Invoices()
    {
        var test = await SeedBookingAsync();
        using var db = test.Db;
        var sut = new InvoiceService(test.Db);

        await sut.CreateInvoiceAsync(new CreateInvoiceDto(test.Booking.Id, 3500m), test.CustomerId);

        var customerInvoices = await sut.GetCustomerInvoicesAsync(test.CustomerId);
        var otherInvoices = await sut.GetCustomerInvoicesAsync(Guid.NewGuid());

        Assert.Single(customerInvoices);
        Assert.Empty(otherInvoices);
    }

    [Fact]
    public async Task UpdateInvoiceStatusAsync_Updates_Status_And_PaidAt()
    {
        var test = await SeedBookingAsync();
        using var db = test.Db;
        var sut = new InvoiceService(test.Db);

        var created = await sut.CreateInvoiceAsync(new CreateInvoiceDto(test.Booking.Id, 4500m), test.ProviderId);
        var updated = await sut.UpdateInvoiceStatusAsync(created.Id, new UpdateInvoiceStatusDto("Paid"));

        Assert.NotNull(updated);
        Assert.Equal("Paid", updated.Status);
        Assert.NotNull(updated.PaidAt);
    }

    [Fact]
    public async Task CreateInvoiceForBookingAsync_Creates_Invoice_With_15Percent_PlatformFee()
    {
        var test = await SeedBookingAsync();
        using var db = test.Db;
        var sut = new InvoiceService(test.Db);

        var result = await sut.CreateInvoiceForBookingAsync(
            test.Booking.Id,
            test.CustomerId,
            test.ProviderId,
            10000m,
            QuoteApprovalStatus.AutoApproved,
            "Electrical Repairs"
        );

        Assert.NotNull(result);
        Assert.Equal(8500m, result.BaseAmount);
        Assert.Equal(1500m, result.PlatformFee);
        Assert.Equal(10000m, result.TotalAmount);
        Assert.Equal(InvoiceStatus.Issued.ToString(), result.Status);
        Assert.Equal("LKR", result.Currency);
        Assert.NotNull(result.LineItems);
        Assert.Contains("Electrical Repairs", result.LineItems);
        Assert.Contains("Platform Trust & Verification Fee (15%)", result.LineItems);
    }

    [Fact]
    public async Task CreateInvoiceForBookingAsync_Is_Idempotent()
    {
        var test = await SeedBookingAsync();
        using var db = test.Db;
        var sut = new InvoiceService(test.Db);

        var first = await sut.CreateInvoiceForBookingAsync(
            test.Booking.Id,
            test.CustomerId,
            test.ProviderId,
            5000m,
            QuoteApprovalStatus.ApprovedWithAudit
        );

        var second = await sut.CreateInvoiceForBookingAsync(
            test.Booking.Id,
            test.CustomerId,
            test.ProviderId,
            5000m,
            QuoteApprovalStatus.ApprovedWithAudit
        );

        Assert.Equal(first.Id, second.Id);
        Assert.Single(db.Invoices.Where(i => i.BookingId == test.Booking.Id));
    }

    [Fact]
    public async Task CreateInvoiceForBookingAsync_FallsBack_To_DefaultPrice_When_Zero()
    {
        var test = await SeedBookingAsync();
        using var db = test.Db;
        var sut = new InvoiceService(test.Db);

        var result = await sut.CreateInvoiceForBookingAsync(
            test.Booking.Id,
            test.CustomerId,
            test.ProviderId,
            0m,
            QuoteApprovalStatus.Approved
        );

        Assert.NotNull(result);
        Assert.Equal(3500m, result.TotalAmount);
        Assert.Equal(2975m, result.BaseAmount); // 85% of 3500
        Assert.Equal(525m, result.PlatformFee); // 15% of 3500
    }
}
