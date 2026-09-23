using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using handee.API.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Data;

public static class MockDataSeeder
{
    public static async Task SeedAsync(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        // Prevent re-seeding by checking if the specific mock data marker user exists.
        var markerEmail = "customer1@mockdata.local";
        if (await userManager.FindByEmailAsync(markerEmail) != null)
        {
            return;
        }

        // Fetch Categories
        var categories = await db.ServiceCategories.ToListAsync();
        if (categories.Count == 0)
        {
            // Fallback in case ServiceCategorySeeder hasn't run or failed
            return;
        }

        var random = new Random(42);
        
        // 1. GENERATE CUSTOMERS
        var customers = new List<ApplicationUser>();
        for (int i = 1; i <= 10; i++)
        {
            var customer = new ApplicationUser
            {
                UserName = $"customer{i}@mockdata.local",
                Email = $"customer{i}@mockdata.local",
                FullName = $"Test Customer {i}",
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-random.Next(10, 100))
            };

            var result = await userManager.CreateAsync(customer, "Password123!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(customer, "Customer");
                customers.Add(customer);
            }
        }

        // 2. GENERATE PROVIDERS & PROFILES & LISTINGS
        var providers = new List<ApplicationUser>();
        var providerProfiles = new List<ProviderProfile>();
        var listings = new List<ServiceListing>();

        for (int i = 1; i <= 10; i++)
        {
            var provider = new ApplicationUser
            {
                UserName = $"provider{i}@mockdata.local",
                Email = $"provider{i}@mockdata.local",
                FullName = $"Test Provider {i}",
                EmailConfirmed = true,
                ProviderVerificationStatus = ProviderVerificationStatus.Verified,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-random.Next(10, 200))
            };

            var userResult = await userManager.CreateAsync(provider, "Password123!");
            if (userResult.Succeeded)
            {
                await userManager.AddToRoleAsync(provider, "Provider");
                providers.Add(provider);

                var selectedCategoryCount = random.Next(1, 4);
                var providerCategories = categories.OrderBy(x => random.Next()).Take(selectedCategoryCount).ToList();

                var profile = new ProviderProfile
                {
                    UserId = provider.Id,
                    Headline = $"Expert in {providerCategories.First().Name}",
                    Bio = $"Hello! I am Test Provider {i}. I have years of experience delivering high quality work.",
                    Description = "I take pride in my work and strive for 100% customer satisfaction.",
                    YearsOfExperience = random.Next(1, 20),
                    ServiceCategories = providerCategories,
                    Languages = ["English"],
                    ServicesOffered = providerCategories.Select(c => c.Name).ToList(),
                    IsAvailableForWork = true,
                    ServiceAreaLatitude = 6.9271 + (random.NextDouble() - 0.5) * 0.1, // Near Colombo
                    ServiceAreaLongitude = 79.8612 + (random.NextDouble() - 0.5) * 0.1,
                    ServiceAreaDisplayName = "Colombo Metro Area",
                    ServiceRadiusKm = random.Next(10, 50),
                    VerificationStatus = handee.API.Entities.VerificationStatus.Verified,
                    RatingAggregate = (decimal)(random.NextDouble() * 2 + 3), // Between 3 and 5
                    TotalReviewCount = random.Next(0, 50),
                    CreatedAt = provider.CreatedAt,
                    AddressLine1 = $"123 Mock Street {i}",
                    City = "Colombo",
                    Country = "Sri Lanka"
                };

                // Add Certifications
                profile.Certifications.Add(new Certification
                {
                    Type = CertificationType.NIC,
                    FileUrl = "/uploads/fake.pdf",
                    OriginalFileName = "fake-certificate.pdf",
                    ReviewStatus = DocumentReviewStatus.Approved
                });

                providerProfiles.Add(profile);

                // Add Service Listings
                foreach (var cat in providerCategories)
                {
                    var minPrice = cat.PriceBandMin ?? 10m;
                    var maxPrice = cat.PriceBandMax ?? 100m;
                    var basePrice = minPrice + (decimal)random.NextDouble() * (maxPrice - minPrice);
                    
                    var sl = new ServiceListing
                    {
                        ProviderId = provider.Id,
                        ServiceCategoryId = cat.Id,
                        Title = $"{cat.Name} Services by Provider {i}",
                        Description = $"Comprehensive {cat.Name} service offering high quality and reliability. Contact me for details.",
                        Scope = "Standard Scope of Work for " + cat.Name,
                        Availability = "Monday - Friday, 9am - 5pm",
                        FixedPrice = Math.Round(basePrice, 2),
                        EstimatedDuration = TimeSpan.FromHours(random.Next(1, 8)),
                        IsActive = true,
                        CreatedAt = provider.CreatedAt.AddDays(random.Next(1, 5))
                    };
                    listings.Add(sl);
                }
            }
        }

        await db.ProviderProfiles.AddRangeAsync(providerProfiles);
        await db.ServiceListings.AddRangeAsync(listings);
        await db.SaveChangesAsync();

        // 3. GENERATE REVIEWS & BOOKINGS
        var bookings = new List<Booking>();
        var reviews = new List<Review>();
        var jobRequests = new List<JobRequest>();

        foreach (var c in customers.Take(5)) // Subset of customers
        {
            foreach (var p in providers.Take(5)) // And subset of providers
            {
                if (random.NextDouble() > 0.5) continue; // Randomly skip

                // Setup Job Request
                var category = p.ServiceListings.FirstOrDefault()?.ServiceCategoryId ?? categories.First().Id;
                
                var jr = new JobRequest
                {
                    CustomerId = c.Id,
                    ServiceCategoryId = category,
                    Description = $"Looking for a reliable provider to help me out with {categories.First(x => x.Id == category).Name}.",
                    Location = "Customer Home Address 101",
                    Urgency = JobUrgency.Medium,
                    Status = JobRequestStatus.Open,
                    CreatedAt = DateTimeOffset.UtcNow.AddDays(-random.Next(5, 30))
                };
                jobRequests.Add(jr);

                // Booking
                var booking = new Booking
                {
                    JobRequestId = jr.Id, // They will be generated in EF core transaction
                    CustomerId = c.Id,
                    ProviderId = p.Id,
                    ScheduledAt = DateTime.UtcNow.AddDays(random.Next(-5, 0)),
                    Status = BookingStatus.Completed,
                    CreatedAt = jr.CreatedAt.AddHours(2)
                };
                
                // Add Bookings immediately so Review can reference it (requires navigation or save).
                // To safely wire up EF Core navigation or IDs, we should save these objects or link objects.
                
                bookings.Add(booking);

                // Re-wire JobRequest Object explicitly by reference since ID is not populated yet
                booking.JobRequest = jr;
            }
        }

        await db.JobRequests.AddRangeAsync(jobRequests);
        await db.Bookings.AddRangeAsync(bookings);
        await db.SaveChangesAsync();

        // Provide Reviews for Bookings
        foreach (var b in bookings.Where(b => b.Status == BookingStatus.Completed))
        {
            // Need the ProviderProfileId for the review
            var profile = providerProfiles.FirstOrDefault(x => x.UserId == b.ProviderId);
            if (profile != null)
            {
                var r = new Review
                {
                    ProviderProfileId = profile.Id,
                    CustomerId = b.CustomerId,
                    Rating = random.Next(3, 6), // 3 to 5 stars
                    Comment = "Great service, very professional. Would definitely recommend!",
                    CreatedAt = b.ScheduledAt?.AddDays(random.Next(1, 3)) ?? b.CreatedAt
                };
                reviews.Add(r);
            }
        }

        await db.Reviews.AddRangeAsync(reviews);
        await db.SaveChangesAsync();
    }
}
