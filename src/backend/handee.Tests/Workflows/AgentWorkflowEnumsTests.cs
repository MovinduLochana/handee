using handee.API.Entities;
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
    public void AgentWorkflow_ValidationTierEnum_UpdatesUnderlyingString()
    {
        var workflow = new AgentWorkflow
        {
            ValidationTierEnum = WorkflowValidationTier.ApprovedForAutoDispatch
        };

        Assert.Equal("approved_for_auto_dispatch", workflow.ValidationTier);
        Assert.Equal(WorkflowValidationTier.ApprovedForAutoDispatch, workflow.ValidationTierEnum);
    }

    [Fact]
    public void AgentWorkflow_ApprovalStatusEnum_UpdatesUnderlyingString()
    {
        var workflow = new AgentWorkflow
        {
            ApprovalStatusEnum = WorkflowApprovalStatus.Approved
        };

        Assert.Equal("approved", workflow.ApprovalStatus);
        Assert.Equal(WorkflowApprovalStatus.Approved, workflow.ApprovalStatusEnum);
    }
}
