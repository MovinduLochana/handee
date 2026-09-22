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
}
