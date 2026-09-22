using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using handee.API.DTO;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Authorize]
public class AssistantController : ControllerBase
{
    private readonly IAgentWorkflowService _agentWorkflowService;

    public AssistantController(IAgentWorkflowService agentWorkflowService)
    {
        _agentWorkflowService = agentWorkflowService;
    }

    // Support both /assistant/query and /api/assistant/query
    [HttpPost("assistant/query")]
    [HttpPost("api/assistant/query")]
    public async Task<IActionResult> Query([FromBody] AssistantQueryRequestDto dto, CancellationToken ct)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var customerId = Guid.TryParse(claim, out var id) ? id : Guid.Empty;

        var response = await _agentWorkflowService.QueryAssistantAsync(customerId, dto.Query, ct);
        return Ok(response);
    }
}
