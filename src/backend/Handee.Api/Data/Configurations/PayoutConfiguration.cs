using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class PayoutConfiguration : IEntityTypeConfiguration<Payout>
{
    public void Configure(EntityTypeBuilder<Payout> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.GrossAmount)
            .HasColumnType("decimal(10,2)")
            .IsRequired();

        builder.Property(p => p.PlatformFeeDeducted)
            .HasColumnType("decimal(10,2)")
            .IsRequired();

        builder.Property(p => p.NetAmount)
            .HasColumnType("decimal(10,2)")
            .IsRequired();

        builder.Property(p => p.Currency)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(p => p.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(p => p.PayoutBatchId)
            .HasMaxLength(100);

        builder.HasOne(p => p.Provider)
            .WithMany()
            .HasForeignKey(p => p.ProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.Booking)
            .WithMany()
            .HasForeignKey(p => p.BookingId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(p => p.ProviderId);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.BookingId);
    }
}
