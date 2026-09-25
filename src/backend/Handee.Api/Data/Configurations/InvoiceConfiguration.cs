using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.BaseAmount)
            .HasColumnType("decimal(10,2)")
            .IsRequired();

        builder.Property(i => i.PlatformFee)
            .HasColumnType("decimal(10,2)")
            .IsRequired();

        builder.Property(i => i.TotalAmount)
            .HasColumnType("decimal(10,2)")
            .IsRequired();

        builder.Property(i => i.Currency)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(i => i.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(i => i.AdminApprovalStatus)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.HasOne(i => i.Booking)
            .WithMany()
            .HasForeignKey(i => i.BookingId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Customer)
            .WithMany()
            .HasForeignKey(i => i.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Provider)
            .WithMany()
            .HasForeignKey(i => i.ProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(i => i.BookingId);
        builder.HasIndex(i => i.CustomerId);
        builder.HasIndex(i => i.ProviderId);
        builder.HasIndex(i => i.Status);
    }
}
