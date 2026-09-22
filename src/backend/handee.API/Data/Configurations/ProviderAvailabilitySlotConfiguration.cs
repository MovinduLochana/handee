using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class ProviderAvailabilitySlotConfiguration : IEntityTypeConfiguration<ProviderAvailabilitySlot>
{
    public void Configure(EntityTypeBuilder<ProviderAvailabilitySlot> builder)
    {
        builder.HasKey(s => s.Id);

        builder.HasOne(s => s.Provider)
            .WithMany()
            .HasForeignKey(s => s.ProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Calendar lookups always filter by provider and scan by time.
        builder.HasIndex(s => new { s.ProviderId, s.StartTime });
    }
}
