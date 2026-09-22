using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.Payments;

public class PaymentServiceTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<(AppDbContext Db, Invoice Invoice, Guid CustomerId, Guid ProviderId)> SeedInvoiceAsync(
        decimal baseAmount = 4000m)
    {
        var db = CreateContext();
        var customerId = Guid.NewGuid();
        var providerId = Guid.NewGuid();
        var bookingId = Guid.NewGuid();

        var customer = new ApplicationUser { Id = customerId, FullName = "Customer A", Email = "a@test.com" };
        var provider = new ApplicationUser { Id = providerId, FullName = "Provider B", Email = "b@test.com" };
        db.Users.AddRange(customer, provider);

        var booking = new Booking
        {
            Id = bookingId,
            CustomerId = customerId,
            ProviderId = providerId,
            Status = BookingStatus.Completed
        };
        db.Bookings.Add(booking);

        var platformFee = Math.Round(baseAmount * 0.15m, 2);
        var invoice = new Invoice
        {
            BookingId = bookingId,
            CustomerId = customerId,
            ProviderId = providerId,
            BaseAmount = baseAmount,
            PlatformFee = platformFee,
            TotalAmount = baseAmount + platformFee,
            Status = InvoiceStatus.Issued
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        return (db, invoice, customerId, providerId);
    }

    [Fact]
    public async Task ProcessPaymentAsync_Successful_Payment_Marks_Invoice_Paid_And_Credits_Payout_Ledger()
    {
        var test = await SeedInvoiceAsync(5000m);
        using var db = test.Db;
        var sut = new PaymentService(test.Db);

        var req = new ProcessPaymentRequestDto(test.Invoice.Id, "card", "tok_sandbox", "4242", "Stripe");
        var result = await sut.ProcessPaymentAsync(req, test.CustomerId);

        Assert.NotNull(result);
        Assert.Equal(PaymentStatus.Succeeded.ToString(), result.Status);
        Assert.StartsWith("ch_sbx_", result.TransactionReference);
        Assert.Equal(5750m, result.Amount); // 5000 base + 750 fee

        // Verify invoice was updated
        var updatedInvoice = await test.Db.Invoices.FindAsync(test.Invoice.Id);
        Assert.NotNull(updatedInvoice);
        Assert.Equal(InvoiceStatus.Paid, updatedInvoice.Status);
        Assert.NotNull(updatedInvoice.PaidAt);

        // Verify payout ledger entry was created
        var payout = await test.Db.Payouts.FirstOrDefaultAsync(p => p.ProviderId == test.ProviderId);
        Assert.NotNull(payout);
        Assert.Equal(5000m, payout.NetAmount);
        Assert.Equal(750m, payout.PlatformFeeDeducted);
        Assert.Equal(5750m, payout.GrossAmount);
        Assert.Equal(PayoutStatus.Pending, payout.Status);
    }

    [Fact]
    public async Task ProcessPaymentAsync_Throws_When_Already_Paid()
    {
        var test = await SeedInvoiceAsync();
        using var db = test.Db;
        var sut = new PaymentService(test.Db);

        var req = new ProcessPaymentRequestDto(test.Invoice.Id);
        await sut.ProcessPaymentAsync(req, test.CustomerId);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.ProcessPaymentAsync(req, test.CustomerId));
    }

    [Fact]
    public async Task ProcessPaymentAsync_Throws_When_Customer_Not_Owner()
    {
        var test = await SeedInvoiceAsync();
        using var db = test.Db;
        var sut = new PaymentService(test.Db);

        var req = new ProcessPaymentRequestDto(test.Invoice.Id);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            sut.ProcessPaymentAsync(req, Guid.NewGuid()));
    }

    [Fact]
    public async Task GetProviderEarningsSummaryAsync_Calculates_Metrics_Correctly()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();

        db.Payouts.AddRange(
            new Payout { ProviderId = providerId, NetAmount = 3000m, Status = PayoutStatus.Completed },
            new Payout { ProviderId = providerId, NetAmount = 4000m, Status = PayoutStatus.Pending },
            new Payout { ProviderId = providerId, NetAmount = 1500m, Status = PayoutStatus.Processing }
        );
        await db.SaveChangesAsync();

        var sut = new PaymentService(db);
        var summary = await sut.GetProviderEarningsSummaryAsync(providerId);

        Assert.Equal(3000m, summary.TotalEarnings);
        Assert.Equal(4000m, summary.AvailableBalance);
        Assert.Equal(1500m, summary.PendingPayouts);
        Assert.Equal(3, summary.CompletedJobsCount);
    }
}
