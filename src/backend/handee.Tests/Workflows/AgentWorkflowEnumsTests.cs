using handee.API.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace handee.Tests.Workflows;

public class AgentWorkflowEnumsTests
{
    [Theory]
    [InlineData("approved_for_auto_dispatch", WorkflowValidationTier.ApprovedForAutoDispatch)]
    [InlineData("ApprovedForAutoDispatch", WorkflowValidationTier.ApprovedForAutoDispatch)]
    [InlineData("approved_with_audit", WorkflowValidationTier.ApprovedWithAudit)]
    [InlineData("requires_human_approval", WorkflowValidationTier.RequiresHumanApproval)]
    [InlineData("unknown_value", WorkflowValidationTier.RequiresHumanApproval)]
    [InlineData(null, WorkflowValidationTier.RequiresHumanApproval)]
    public void ParseValidationTier_ReturnsExpectedEnum(string? input, WorkflowValidationTier expected)
    {
        var result = AgentWorkflow.ParseValidationTier(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(WorkflowValidationTier.ApprovedForAutoDispatch, "approved_for_auto_dispatch")]
    [InlineData(WorkflowValidationTier.ApprovedWithAudit, "approved_with_audit")]
    [InlineData(WorkflowValidationTier.RequiresHumanApproval, "requires_human_approval")]
    public void FormatValidationTier_ReturnsCanonicalString(WorkflowValidationTier input, string expected)
    {
        var result = AgentWorkflow.FormatValidationTier(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("approved", WorkflowApprovalStatus.Approved)]
    [InlineData("Approve", WorkflowApprovalStatus.Approved)]
    [InlineData("rejected", WorkflowApprovalStatus.Rejected)]
    [InlineData("revised", WorkflowApprovalStatus.Revised)]
    [InlineData("pending", WorkflowApprovalStatus.Pending)]
    [InlineData(null, WorkflowApprovalStatus.Pending)]
    public void ParseApprovalStatus_ReturnsExpectedEnum(string? input, WorkflowApprovalStatus expected)
    {
        var result = AgentWorkflow.ParseApprovalStatus(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(WorkflowApprovalStatus.Approved, "approved")]
    [InlineData(WorkflowApprovalStatus.Rejected, "rejected")]
    [InlineData(WorkflowApprovalStatus.Revised, "revised")]
    [InlineData(WorkflowApprovalStatus.Pending, "pending")]
    public void FormatApprovalStatus_ReturnsCanonicalString(WorkflowApprovalStatus input, string expected)
    {
        var result = AgentWorkflow.FormatApprovalStatus(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void AgentWorkflow_DefaultEnums_AreCorrectlyInitialized()
    {
        var workflow = new AgentWorkflow();
        Assert.Equal(WorkflowValidationTier.RequiresHumanApproval, workflow.ValidationTier);
        Assert.Equal(WorkflowApprovalStatus.Pending, workflow.ApprovalStatus);
    }

    [Fact]
    public async Task AgentWorkflow_Enums_PersistAndRetrieveViaEFCore()
    {
        var options = new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<handee.API.Data.AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new handee.API.Data.AppDbContext(options);

        var workflow = new AgentWorkflow
        {
            WorkflowId = "wf-ef-enum-test",
            Objective = "Test EF Core Enum mapping",
            ValidationTier = WorkflowValidationTier.ApprovedForAutoDispatch,
            ApprovalStatus = WorkflowApprovalStatus.Approved
        };

        db.AgentWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var retrieved = await db.AgentWorkflows.FindAsync(workflow.Id);
        Assert.NotNull(retrieved);
        Assert.Equal(WorkflowValidationTier.ApprovedForAutoDispatch, retrieved.ValidationTier);
        Assert.Equal(WorkflowApprovalStatus.Approved, retrieved.ApprovalStatus);
    }
}
