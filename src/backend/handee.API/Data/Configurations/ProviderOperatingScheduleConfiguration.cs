using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class ProviderOperatingScheduleConfiguration : IEntityTypeConfiguration<ProviderOperatingSchedule>
{
    public void Configure(EntityTypeBuilder<ProviderOperatingSchedule> builder)
    {
        builder.HasKey(s => s.Id);

        builder.HasOne(s => s.Provider)
            .WithMany()
            .HasForeignKey(s => s.ProviderId)
            .OnDelete(DeleteBehavior.Cascade);

        // One schedule entry per day of the week per provider
        builder.HasIndex(s => new { s.ProviderId, s.DayOfWeek }).IsUnique();

        builder.ToTable("ProviderOperatingSchedules");
    }
}
