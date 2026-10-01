using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using handee.API.Common.Extensions;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Route("job-requests")]
[Route("api/job-requests")]
[Authorize]
public class JobRequestController : ControllerBase
{
    private readonly IJobRequestService _jobRequestService;
    private readonly IAgentWorkflowService _agentWorkflowService;

    public JobRequestController(
        IJobRequestService jobRequestService,
        IAgentWorkflowService agentWorkflowService)
    {
        _jobRequestService = jobRequestService;
        _agentWorkflowService = agentWorkflowService;
    }

    // GET /job-requests/{id}/workflow
    [HttpGet("{id:guid}/workflow")]
    public async Task<IActionResult> GetWorkflow(Guid id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var job = await _jobRequestService.GetByIdAsync(id, userId.Value, User.IsInRole("Admin"));
        if (job is null) return NotFound();

        var workflow = await _agentWorkflowService.GetByJobRequestIdAsync(id, ct);
        return workflow is null ? NotFound() : Ok(workflow);
    }

    // POST /job-requests
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateJobRequestDto dto)
    {
        var customerId = User.GetUserId();
        if (customerId is null) return Unauthorized();

        var result = await _jobRequestService.CreateAsync(customerId.Value, dto);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    // GET /job-requests/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _jobRequestService.GetByIdAsync(id, userId.Value, User.IsInRole("Admin"));
        return result is null ? NotFound() : Ok(result);
    }

    // GET /job-requests/mine
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var customerId = User.GetUserId();
        if (customerId is null) return Unauthorized();

        var result = await _jobRequestService.GetForCustomerAsync(customerId.Value);
        return Ok(result);
    }

    // GET /job-requests
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetForStaff(
        [FromQuery] JobRequestStatus? status,
        [FromQuery] JobUrgency? urgency,
        [FromQuery] bool sortDescending = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _jobRequestService.GetForStaffAsync(status, urgency, sortDescending, page, pageSize);
        return Ok(result);
    }

}
