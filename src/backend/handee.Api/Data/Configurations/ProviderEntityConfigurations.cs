using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class ProviderProfileConfiguration : IEntityTypeConfiguration<ProviderProfile>
{
    public void Configure(EntityTypeBuilder<ProviderProfile> builder)
    {
        builder.HasKey(p => p.Id);

        // UserId is unique — one profile per user
        builder.HasIndex(p => p.UserId).IsUnique();

        // Composite index for geo-spatial queries (skill + area)
        builder.HasIndex(p => new { p.ServiceAreaLatitude, p.ServiceAreaLongitude });

        // VerificationStatus stored as string for readability
        builder.Property(p => p.VerificationStatus)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        // Decimal precision for rating
        builder.Property(p => p.RatingAggregate)
            .HasPrecision(3, 2);

        // String field lengths
        builder.Property(p => p.Headline).HasMaxLength(120);
        builder.Property(p => p.Bio).HasMaxLength(500);
        builder.Property(p => p.Description).HasMaxLength(3000);
        builder.Property(p => p.ServiceAreaDisplayName).HasMaxLength(200);
        builder.Property(p => p.AvailabilityNote).HasMaxLength(200);

        // Address fields
        builder.Property(p => p.AddressLine1).HasMaxLength(200);
        builder.Property(p => p.AddressLine2).HasMaxLength(200);
        builder.Property(p => p.City).HasMaxLength(100);
        builder.Property(p => p.State).HasMaxLength(100);
        builder.Property(p => p.PostalCode).HasMaxLength(20);
        builder.Property(p => p.Country).HasMaxLength(100);

        // Arrays stored as JSON column (EF Core 8+ / Npgsql supports this natively)
        builder.Property(p => p.Languages)
            .HasColumnType("text[]");

        builder.Property(p => p.ServicesOffered)
            .HasColumnType("text[]");

        // Many-to-many: ProviderProfile ↔ SkillCategory
        builder.HasMany(p => p.SkillCategories)
            .WithMany(s => s.Providers)
            .UsingEntity(j => j.ToTable("ProviderSkillCategories"));

        // One-to-many: ProviderProfile → Certification
        builder.HasMany(p => p.Certifications)
            .WithOne(c => c.ProviderProfile)
            .HasForeignKey(c => c.ProviderProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        // One-to-many: ProviderProfile → VerificationAuditLog
        builder.HasMany(p => p.AuditLogs)
            .WithOne(a => a.ProviderProfile)
            .HasForeignKey(a => a.ProviderProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        // FK to ApplicationUser
        builder.HasOne(p => p.User)
            .WithOne()
            .HasForeignKey<ProviderProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable("ProviderProfiles");
    }
}

public class CertificationConfiguration : IEntityTypeConfiguration<Certification>
{
    public void Configure(EntityTypeBuilder<Certification> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Type)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(c => c.ReviewStatus)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(c => c.FileUrl).HasMaxLength(500).IsRequired();
        builder.Property(c => c.OriginalFileName).HasMaxLength(255);

        builder.ToTable("Certifications");
    }
}

public class SkillCategoryConfiguration : IEntityTypeConfiguration<SkillCategory>
{
    public void Configure(EntityTypeBuilder<SkillCategory> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Name).HasMaxLength(100).IsRequired();
        builder.HasIndex(s => s.Name).IsUnique();
        builder.Property(s => s.IconUrl).HasMaxLength(500);
        builder.ToTable("SkillCategories");
    }
}

public class VerificationAuditLogConfiguration : IEntityTypeConfiguration<VerificationAuditLog>
{
    public void Configure(EntityTypeBuilder<VerificationAuditLog> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.PreviousStatus)
            .HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.Property(a => a.NewStatus)
            .HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.Property(a => a.Note).HasMaxLength(500);

        builder.HasIndex(a => a.ProviderProfileId);
        builder.HasIndex(a => a.Timestamp);

        builder.ToTable("VerificationAuditLogs");
    }
}
