using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using handee.API.Entities;

namespace handee.API.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
// Provider Verification & Profiles
    public DbSet<ProviderProfile> ProviderProfiles => Set<ProviderProfile>();
    public DbSet<Certification> Certifications => Set<Certification>();
    public DbSet<SkillCategory> SkillCategories => Set<SkillCategory>();
    public DbSet<VerificationAuditLog> VerificationAuditLogs => Set<VerificationAuditLog>();
    public DbSet<Review> Reviews => Set<Review>();

    public DbSet<JobRequest> JobRequests => Set<JobRequest>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<ServiceCategory> ServiceCategories => Set<ServiceCategory>();
    public DbSet<ServiceListing> ServiceListings => Set<ServiceListing>();
    public DbSet<ProviderAvailabilitySlot> ProviderAvailabilitySlots => Set<ProviderAvailabilitySlot>();
    public DbSet<AgentWorkflow> AgentWorkflows => Set<AgentWorkflow>();
    public DbSet<AgentStepLog> AgentStepLogs => Set<AgentStepLog>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}