using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class ServiceCategoryConfiguration : IEntityTypeConfiguration<ServiceCategory>
{
    public void Configure(EntityTypeBuilder<ServiceCategory> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.IconUrl)
            .HasMaxLength(500);

        builder.Property(c => c.PriceBandMin)
            .HasPrecision(10, 2);

        builder.Property(c => c.PriceBandMax)
            .HasPrecision(10, 2);

        // Not explicitly asked for, but the seeder is idempotent by name and
        // duplicate category names would be a real data-integrity problem.
        builder.HasIndex(c => c.Name)
            .IsUnique();
    }
}
