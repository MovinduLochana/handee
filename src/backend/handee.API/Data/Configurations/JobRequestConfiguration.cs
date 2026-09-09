using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class JobRequestConfiguration : IEntityTypeConfiguration<JobRequest>
{
    public void Configure(EntityTypeBuilder<JobRequest> builder)
    {
        builder.HasKey(j => j.Id);

        builder.HasOne(j => j.Customer)
            .WithMany()
            .HasForeignKey(j => j.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(j => j.Category)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(j => j.Description)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(j => j.Location)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(j => j.Urgency)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(j => j.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(j => j.BudgetMin)
            .HasPrecision(10, 2);

        builder.Property(j => j.BudgetMax)
            .HasPrecision(10, 2);
    }
}
