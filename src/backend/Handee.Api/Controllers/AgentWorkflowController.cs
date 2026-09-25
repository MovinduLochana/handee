using System.Security.Claims;
using handee.API.Common.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using handee.API.DTO;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Route("admin/agent-workflows")]
[Route("api/admin/agent-workflows")]
[Authorize(Roles = "Admin")]
public class AgentWorkflowController : ControllerBase
{
    private readonly IAgentWorkflowService _agentWorkflowService;

    public AgentWorkflowController(IAgentWorkflowService agentWorkflowService)
    {
        _agentWorkflowService = agentWorkflowService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? tier,
        [FromQuery] string? status,
        CancellationToken ct)
    {
        var result = await _agentWorkflowService.GetAllAsync(tier, status, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _agentWorkflowService.GetByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpGet("by-job/{jobRequestId:guid}")]
    public async Task<IActionResult> GetByJobId(Guid jobRequestId, CancellationToken ct)
    {
        var result = await _agentWorkflowService.GetByJobRequestIdAsync(jobRequestId, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/decision")]
    public async Task<IActionResult> MakeDecision(
        Guid id,
        [FromBody] AdminWorkflowDecisionDto dto,
        CancellationToken ct)
    {
        var adminId = User.GetUserId();
        if (adminId is null) return Unauthorized();

        try
        {
            var result = await _agentWorkflowService.MakeDecisionAsync(id, adminId.Value, dto, ct);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
