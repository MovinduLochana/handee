using handee.API.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Data;

public static class InvoiceSeeder
{
    public static async Task SeedAsync(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        // 1. Idempotent check: skip if invoices already exist
        if (await db.Invoices.AnyAsync())
            return;

        // 2. Ensure customer user exists
        const string customerEmail = "customer@handee.lk";
        var customer = await userManager.FindByEmailAsync(customerEmail);
        if (customer == null)
        {
            customer = new ApplicationUser
            {
                FullName = "Kasun Perera",
                Email = customerEmail,
                UserName = customerEmail,
                PhoneNumber = "+94 77 123 4567",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            var createRes = await userManager.CreateAsync(customer, "Password@123");
            if (createRes.Succeeded)
            {
                await userManager.AddToRoleAsync(customer, "Customer");
            }
        }

        // 3. Ensure provider user exists
        const string providerEmail = "provider@handee.lk";
        var provider = await userManager.FindByEmailAsync(providerEmail);
        if (provider == null)
        {
            provider = new ApplicationUser
            {
                FullName = "Nimal Jayawardena",
                Email = providerEmail,
                UserName = providerEmail,
                PhoneNumber = "+94 71 987 6543",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            var createRes = await userManager.CreateAsync(provider, "Password@123");
            if (createRes.Succeeded)
            {
                await userManager.AddToRoleAsync(provider, "Provider");
            }
        }

        // 4. Ensure plumbing and AC repair categories exist
        var plumbingCategory = await db.ServiceCategories.FirstOrDefaultAsync(c => c.Name == "Plumbing");
        if (plumbingCategory == null)
        {
            plumbingCategory = new ServiceCategory { Name = "Plumbing", PriceBandMin = 30m, PriceBandMax = 300m };
            db.ServiceCategories.Add(plumbingCategory);
            await db.SaveChangesAsync();
        }

        var acCategory = await db.ServiceCategories.FirstOrDefaultAsync(c => c.Name == "AC Repair");
        if (acCategory == null)
        {
            acCategory = new ServiceCategory { Name = "AC Repair", PriceBandMin = 50m, PriceBandMax = 500m };
            db.ServiceCategories.Add(acCategory);
            await db.SaveChangesAsync();
        }

        // 5. Seed Job 1 & Booking 1: Completed & Paid with Settled Payout
        var jobRequest1 = new JobRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            ServiceCategoryId = plumbingCategory.Id,
            Description = "Emergency water leak in bathroom ceiling requiring pipe joint replacement.",
            Location = "Colombo 03",
            Urgency = JobUrgency.High,
            Status = JobRequestStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-2)
        };
        db.JobRequests.Add(jobRequest1);

        var booking1 = new Booking
        {
            Id = Guid.NewGuid(),
            JobRequestId = jobRequest1.Id,
            CustomerId = customer.Id,
            ProviderId = provider.Id,
            Status = BookingStatus.Completed,
            ScheduledAt = DateTimeOffset.UtcNow.AddDays(-2),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        };
        db.Bookings.Add(booking1);

        var invoice1 = new Invoice
        {
            Id = Guid.NewGuid(),
            BookingId = booking1.Id,
            CustomerId = customer.Id,
            ProviderId = provider.Id,
            BaseAmount = 3825.00m, // 85% trade labor
            PlatformFee = 675.00m,  // 15% platform safety fee
            TotalAmount = 4500.00m,
            Currency = "LKR",
            Status = InvoiceStatus.Paid,
            AdminApprovalStatus = QuoteApprovalStatus.AutoApproved,
            LineItemsJson = "[{\"item\":\"Plumbing - Labor and Trade Service\",\"price\":3825.00,\"type\":\"Labor\"},{\"item\":\"Platform Trust & Verification Fee (15%)\",\"price\":675.00,\"type\":\"Fee\"}]",
            DueAt = DateTimeOffset.UtcNow.AddDays(1),
            PaidAt = DateTimeOffset.UtcNow.AddDays(-1),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-2)
        };
        db.Invoices.Add(invoice1);

        var payment1 = new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice1.Id,
            BookingId = booking1.Id,
            CustomerId = customer.Id,
            Amount = 4500.00m,
            Currency = "LKR",
            GatewayProvider = "Stripe",
            TransactionReference = "ch_sbx_demo_pipeleak01",
            Status = PaymentStatus.Succeeded,
            PaymentMethodType = "card",
            CardLast4 = "4242",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            SettledAt = DateTimeOffset.UtcNow.AddDays(-1)
        };
        db.Payments.Add(payment1);

        var payout1 = new Payout
        {
            Id = Guid.NewGuid(),
            ProviderId = provider.Id,
            BookingId = booking1.Id,
            GrossAmount = 4500.00m,
            PlatformFeeDeducted = 675.00m,
            NetAmount = 3825.00m,
            Currency = "LKR",
            Status = PayoutStatus.Completed,
            PayoutBatchId = "payout_batch_202609_01",
            DisbursedAt = DateTimeOffset.UtcNow.AddDays(-1),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        };
        db.Payouts.Add(payout1);

        // 6. Seed Job 2 & Booking 2: Active / Issued Invoice ready for demo payment
        var jobRequest2 = new JobRequest
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            ServiceCategoryId = acCategory.Id,
            Description = "AC seasonal overhaul, gas refill, and deep coil cleaning.",
            Location = "Colombo 07",
            Urgency = JobUrgency.Medium,
            Status = JobRequestStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow.AddHours(-4)
        };
        db.JobRequests.Add(jobRequest2);

        var booking2 = new Booking
        {
            Id = Guid.NewGuid(),
            JobRequestId = jobRequest2.Id,
            CustomerId = customer.Id,
            ProviderId = provider.Id,
            Status = BookingStatus.Accepted,
            ScheduledAt = DateTimeOffset.UtcNow.AddHours(2),
            CreatedAt = DateTimeOffset.UtcNow.AddHours(-4)
        };
        db.Bookings.Add(booking2);

        var invoice2 = new Invoice
        {
            Id = Guid.NewGuid(),
            BookingId = booking2.Id,
            CustomerId = customer.Id,
            ProviderId = provider.Id,
            BaseAmount = 5100.00m, // 85% trade labor
            PlatformFee = 900.00m,  // 15% platform safety fee
            TotalAmount = 6000.00m,
            Currency = "LKR",
            Status = InvoiceStatus.Issued,
            AdminApprovalStatus = QuoteApprovalStatus.AutoApproved,
            LineItemsJson = "[{\"item\":\"AC Repair - Labor and Diagnostic Service\",\"price\":5100.00,\"type\":\"Labor\"},{\"item\":\"Platform Trust & Verification Fee (15%)\",\"price\":900.00,\"type\":\"Fee\"}]",
            DueAt = DateTimeOffset.UtcNow.AddDays(3),
            CreatedAt = DateTimeOffset.UtcNow.AddHours(-4)
        };
        db.Invoices.Add(invoice2);

        await db.SaveChangesAsync();
    }
}
