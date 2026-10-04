using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using handee.API.Entities;

namespace handee.API.Data.Configurations;

public class SystemSettingConfiguration : IEntityTypeConfiguration<SystemSetting>
{
    public void Configure(EntityTypeBuilder<SystemSetting> builder)
    {
        builder.HasKey(s => s.Key);
        builder.Property(s => s.Key).HasMaxLength(128);
        builder.Property(s => s.ValueJson).IsRequired();
        builder.Property(s => s.Description).HasMaxLength(256);
    }
}
