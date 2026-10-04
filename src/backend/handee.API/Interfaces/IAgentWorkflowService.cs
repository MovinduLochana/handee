using handee.API.DTO;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IAgentWorkflowService
{
    Task<AgentWorkflow> DispatchWorkflowAsync(JobRequest jobRequest, CancellationToken ct = default);
    Task<AssistantQueryResponseDto> QueryAssistantAsync(Guid customerId, string query, CancellationToken ct = default);
    Task<AgentWorkflowResponseDto?> GetByIdAsync(Guid workflowId, CancellationToken ct = default);
    Task<AgentWorkflowResponseDto?> GetByJobRequestIdAsync(Guid jobRequestId, CancellationToken ct = default);
    Task<List<AgentWorkflowResponseDto>> GetAllAsync(string? tier = null, string? status = null, CancellationToken ct = default);
    Task<AgentWorkflowResponseDto> MakeDecisionAsync(Guid workflowId, Guid adminId, AdminWorkflowDecisionDto dto, CancellationToken ct = default);
    Task<bool> RedispatchInstantMatchAsync(Guid expiredBookingId, CancellationToken ct = default);
}
