using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.HasKey(b => b.Id);

        builder.HasOne(b => b.JobRequest)
            .WithMany()
            .HasForeignKey(b => b.JobRequestId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(b => b.Provider)
            .WithMany()
            .HasForeignKey(b => b.ProviderId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);

        builder.HasOne(b => b.Customer)
            .WithMany()
            .HasForeignKey(b => b.CustomerId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);

        builder.Property(b => b.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(b => b.BookingType)
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(BookingType.Scheduled)
            .IsRequired();

        builder.Property(b => b.ExpiresAt)
            .IsRequired(false);

        builder.HasOne(b => b.ServiceListing)
            .WithMany()
            .HasForeignKey(b => b.ServiceListingId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(b => b.Status);
        builder.HasIndex(b => b.BookingType);
    }
}
