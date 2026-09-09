using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken> {
    
    public void Configure(EntityTypeBuilder<RefreshToken> builder) 
    {
        
        // Primary Key
        builder.HasKey(rt => rt.RefreshTokenId);

        // User relationship
        builder.HasOne(rt => rt.User)
            .WithMany()
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Token Hash
        builder.Property(rt => rt.TokenHash)
            .IsRequired()
            .HasMaxLength(128);

        // Family ID
        builder.Property(rt => rt.FamilyId)
            .IsRequired();

        // Issued At
        builder.Property(rt => rt.IssuedAt)
            .IsRequired();

        // Expires At
        builder.Property(rt => rt.ExpiresAt)
            .IsRequired();

        // Used
        builder.Property(rt => rt.Used)
            .IsRequired()
            .HasDefaultValue(false);

        // Revoked At
        builder.Property(rt => rt.RevokedAt)
            .IsRequired(false);

        // Created By IP
        builder.Property(rt => rt.CreatedByIp)
            .IsRequired(false)
            .HasMaxLength(45);

        // Indexes
        builder.HasIndex(rt => rt.TokenHash)
            .IsUnique();

        builder.HasIndex(rt => rt.UserId);

        builder.HasIndex(rt => rt.FamilyId);
    }
}