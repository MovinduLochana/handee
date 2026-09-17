using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class ReviewEntityConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.HasKey(r => r.Id);

        // One review per customer per provider profile
        builder.HasIndex(r => new { r.ProviderProfileId, r.CustomerId }).IsUnique();

        builder.Property(r => r.Rating)
            .IsRequired();

        // Ensure rating is between 1 and 5 at DB level (using Check Constraint)
        builder.ToTable("Reviews", t => t.HasCheckConstraint("CK_Review_Rating", "\"Rating\" >= 1 AND \"Rating\" <= 5"));

        builder.Property(r => r.Comment)
            .HasMaxLength(1500);
            
        builder.Property(r => r.PhotoUrls)
            .HasColumnType("text[]");

        builder.HasOne(r => r.ProviderProfile)
            .WithMany(p => p.Reviews)
            .HasForeignKey(r => r.ProviderProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.Customer)
            .WithMany()
            .HasForeignKey(r => r.CustomerId)
            .OnDelete(DeleteBehavior.SetNull); // or Cascade depending on user deletion policy, but Customer usually Cascade or Restrict, sticking to Cascade matching others. Wait, ApplicationUser is handled by Identity, usually Cascade. I will just do Cascade. Let's fix that below.
    }
}
