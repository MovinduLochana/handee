using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace handee.API.Data.Configurations;

public class AgentWorkflowConfiguration : IEntityTypeConfiguration<AgentWorkflow>
{
    public void Configure(EntityTypeBuilder<AgentWorkflow> builder)
    {
        builder.HasKey(w => w.Id);

        builder.Property(w => w.WorkflowId)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(w => w.ValidationTier)
            .HasConversion(
                v => AgentWorkflow.FormatValidationTier(v),
                v => AgentWorkflow.ParseValidationTier(v))
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(w => w.ApprovalStatus)
            .HasConversion(
                v => AgentWorkflow.FormatApprovalStatus(v),
                v => AgentWorkflow.ParseApprovalStatus(v))
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(w => w.EstimatedPrice)
            .HasPrecision(10, 2);

        builder.HasOne(w => w.JobRequest)
            .WithMany()
            .HasForeignKey(w => w.JobRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.SelectedProvider)
            .WithMany()
            .HasForeignKey(w => w.SelectedProviderId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(w => w.StepLogs)
            .WithOne(s => s.AgentWorkflow)
            .HasForeignKey(s => s.AgentWorkflowId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class AgentStepLogConfiguration : IEntityTypeConfiguration<AgentStepLog>
{
    public void Configure(EntityTypeBuilder<AgentStepLog> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.AgentName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.Action)
            .IsRequired()
            .HasMaxLength(100);
    }
}
