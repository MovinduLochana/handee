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

        Assert.Equal(4500m, summary.TotalEarnings);
        Assert.Equal(3000m, summary.AvailableBalance);
        Assert.Equal(5500m, summary.PendingPayouts);
        Assert.Equal(3, summary.CompletedJobsCount);
    }

    [Fact]
    public async Task GetPaymentByInvoiceIdAsync_Returns_Payment_When_Exists()
    {
        var test = await SeedInvoiceAsync(3000m);
        using var db = test.Db;
        var sut = new PaymentService(db);

        var req = new ProcessPaymentRequestDto(test.Invoice.Id, "card", null, "tok_123", null, "4242");
        var processed = await sut.ProcessPaymentAsync(req, test.CustomerId);

        var found = await sut.GetPaymentByInvoiceIdAsync(test.Invoice.Id);
        Assert.NotNull(found);
        Assert.Equal(processed.Id, found.Id);
        Assert.Equal(test.Invoice.Id, found.InvoiceId);
        Assert.Equal("Stripe", found.GatewayProvider);
        Assert.Equal("4242", found.CardLast4);
    }

    [Fact]
    public async Task GetAdminPayoutsOverviewAsync_Aggregates_Volume_And_Fees()
    {
        using var db = CreateContext();
        var provider1 = Guid.NewGuid();
        var provider2 = Guid.NewGuid();

        db.Users.AddRange(
            new ApplicationUser { Id = provider1, FullName = "Provider One", Email = "p1@test.com" },
            new ApplicationUser { Id = provider2, FullName = "Provider Two", Email = "p2@test.com" }
        );

        db.Payouts.AddRange(
            new Payout { ProviderId = provider1, GrossAmount = 5750m, PlatformFeeDeducted = 750m, NetAmount = 5000m, Status = PayoutStatus.Completed },
            new Payout { ProviderId = provider2, GrossAmount = 3450m, PlatformFeeDeducted = 450m, NetAmount = 3000m, Status = PayoutStatus.Pending }
        );
        await db.SaveChangesAsync();

        var sut = new PaymentService(db);
        var overview = await sut.GetAdminPayoutsOverviewAsync();

        Assert.Equal(9200m, overview.TotalGrossVolume);
        Assert.Equal(1200m, overview.TotalPlatformFees);
        Assert.Equal(5000m, overview.TotalPaidOut);
        Assert.Equal(1, overview.PendingPayoutCount);
        Assert.Equal(2, overview.RecentPayouts.Count);
    }

    [Fact]
    public async Task ProcessPayoutAsync_Marks_Payout_Completed_And_Disburses()
    {
        using var db = CreateContext();
        var payoutId = Guid.NewGuid();
        var providerId = Guid.NewGuid();

        db.Users.Add(new ApplicationUser { Id = providerId, FullName = "Provider Disburse", Email = "pdisb@test.com" });
        db.Payouts.Add(new Payout
        {
            Id = payoutId,
            ProviderId = providerId,
            GrossAmount = 4600m,
            PlatformFeeDeducted = 600m,
            NetAmount = 4000m,
            Status = PayoutStatus.Pending
        });
        await db.SaveChangesAsync();

        var sut = new PaymentService(db);
        var processed = await sut.ProcessPayoutAsync(payoutId);

        Assert.NotNull(processed);
        Assert.Equal(PayoutStatus.Completed.ToString(), processed.Status);
        Assert.NotNull(processed.DisbursedAt);
        Assert.StartsWith("disb_", processed.PayoutBatchId);

        var updated = await db.Payouts.FindAsync(payoutId);
        Assert.NotNull(updated);
        Assert.Equal(PayoutStatus.Completed, updated.Status);
    }

    [Fact]
    public void PayHereSecurity_Generates_And_Verifies_Checksum_Successfully()
    {
        var merchantId = "1211149";
        var orderId = "inv_test_123";
        var amount = 5000.00m;
        var currency = "LKR";
        var secret = "secret_sandbox_key";

        var hash = handee.API.Common.PayHereSecurity.GenerateCheckoutHash(
            merchantId, orderId, amount, currency, secret);

        Assert.NotNull(hash);
        Assert.NotEmpty(hash);
        Assert.Equal(32, hash.Length);

        // Verification of IPN notification checksum
        var isValid = handee.API.Common.PayHereSecurity.VerifyNotificationHash(
            merchantId, orderId, "5000.00", currency, "2", secret,
            handee.API.Common.PayHereSecurity.CreateMd5($"{merchantId}{orderId}5000.00{currency}2{handee.API.Common.PayHereSecurity.CreateMd5(secret)}")
        );

        Assert.True(isValid);
    }

    [Fact]
    public async Task ConfirmPayHerePaymentAsync_Marks_Invoice_Paid_And_Sets_PayHere_Provider()
    {
        var test = await SeedInvoiceAsync(4500m);
        using var db = test.Db;
        var sut = new PaymentService(test.Db);

        var result = await sut.ConfirmPayHerePaymentAsync(
            test.Invoice.Id,
            "ph_pay_998877",
            5175m,
            "LKR",
            "************4242",
            "VISA"
        );

        Assert.NotNull(result);
        Assert.Equal("Succeeded", result.Status);
        Assert.Equal("PayHere-Sandbox", result.GatewayProvider);
        Assert.Equal("ph_pay_998877", result.TransactionReference);

        var updatedInvoice = await test.Db.Invoices.FindAsync(test.Invoice.Id);
        Assert.NotNull(updatedInvoice);
        Assert.Equal(InvoiceStatus.Paid, updatedInvoice.Status);
    }

    [Fact]
    public async Task Save_And_Get_ProviderBankAccount_Saves_And_Retrieves_Details()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var sut = new PaymentService(db);

        var dto = new ProviderBankAccountDto(
            "Commercial Bank of Ceylon",
            "Kollupitiya",
            "042",
            "8123456789",
            "Nimal Jayawardena"
        );

        var saved = await sut.SaveProviderBankAccountAsync(providerId, dto);
        Assert.NotNull(saved);
        Assert.Equal("Commercial Bank of Ceylon", saved.BankName);
        Assert.Equal("8123456789", saved.AccountNumber);

        var retrieved = await sut.GetProviderBankAccountAsync(providerId);
        Assert.NotNull(retrieved);
        Assert.Equal("Commercial Bank of Ceylon", retrieved.BankName);
        Assert.Equal("Kollupitiya", retrieved.BranchName);
        Assert.Equal("8123456789", retrieved.AccountNumber);
        Assert.Equal("Nimal Jayawardena", retrieved.AccountHolderName);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_Moves_Completed_Payouts_To_Withdrawn_With_BatchRef()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var sut = new PaymentService(db);

        // Save bank account first
        await sut.SaveProviderBankAccountAsync(providerId, new ProviderBankAccountDto(
            "Sampath Bank",
            "Bambalapitiya",
            "015",
            "100234567890",
            "Kamal Perera"
        ));

        // Add 2 completed payouts
        db.Payouts.AddRange(
            new Payout { ProviderId = providerId, GrossAmount = 5000m, PlatformFeeDeducted = 750m, NetAmount = 4250m, Status = PayoutStatus.Completed },
            new Payout { ProviderId = providerId, GrossAmount = 3000m, PlatformFeeDeducted = 450m, NetAmount = 2550m, Status = PayoutStatus.Completed }
        );
        await db.SaveChangesAsync();

        var withdrawal = await sut.RequestWithdrawalAsync(providerId);

        Assert.True(withdrawal.Success);
        Assert.Equal(6800m, withdrawal.AmountRequested);
        Assert.StartsWith("WTH-", withdrawal.BatchReference);
        Assert.Equal(2, withdrawal.PayoutsProcessed);

        var summary = await sut.GetProviderEarningsSummaryAsync(providerId);
        Assert.Equal(0m, summary.AvailableBalance);
        Assert.Equal(0m, summary.PendingPayouts);   // Withdrawn payouts are no longer "pending"
        Assert.Equal(6800m, summary.TotalEarnings); // Withdrawn payouts count toward total earnings
        Assert.NotNull(summary.BankAccount);
        Assert.Equal("Sampath Bank", summary.BankAccount.BankName);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_Throws_When_Only_Pending_Payouts_Exist()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var sut = new PaymentService(db);

        await sut.SaveProviderBankAccountAsync(providerId, new ProviderBankAccountDto(
            "Commercial Bank",
            "Colombo",
            "001",
            "8101234567",
            "Test Provider"
        ));

        db.Payouts.Add(new Payout
        {
            ProviderId = providerId,
            GrossAmount = 5000m,
            PlatformFeeDeducted = 750m,
            NetAmount = 4250m,
            Status = PayoutStatus.Pending
        });
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => sut.RequestWithdrawalAsync(providerId));
        Assert.Contains("completed payout balance", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_Throws_When_No_Bank_Account_Saved()
    {
        using var db = CreateContext();
        var providerId = Guid.NewGuid();
        var sut = new PaymentService(db);

        db.Payouts.Add(new Payout
        {
            ProviderId = providerId,
            GrossAmount = 5000m,
            PlatformFeeDeducted = 750m,
            NetAmount = 4250m,
            Status = PayoutStatus.Completed
        });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.RequestWithdrawalAsync(providerId));
    }
}


