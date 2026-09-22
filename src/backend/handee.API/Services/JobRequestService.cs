using Microsoft.EntityFrameworkCore;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Services;

public class JobRequestService : IJobRequestService
{
    private readonly AppDbContext _db;
    private readonly IAgentWorkflowService _agentWorkflowService;

    public JobRequestService(AppDbContext db, IAgentWorkflowService agentWorkflowService)
    {
        _db = db;
        _agentWorkflowService = agentWorkflowService;
    }

    public async Task<JobRequestResponseDto> CreateAsync(Guid customerId, CreateJobRequestDto dto)
    {
        var categoryExists = await _db.ServiceCategories.AnyAsync(c => c.Id == dto.ServiceCategoryId);
        if (!categoryExists)
            throw new NotFoundException("Service category not found.");

        var jobRequest = new JobRequest
        {
            ServiceCategoryId = dto.ServiceCategoryId,
            Description = dto.Description,
            PhotoUrls = dto.PhotoUrls,
            Location = dto.Location,
            Urgency = dto.Urgency,
            BudgetMin = dto.BudgetMin,
            BudgetMax = dto.BudgetMax,
            CustomerId = customerId,
            Status = JobRequestStatus.PendingAiReview
        };

        _db.JobRequests.Add(jobRequest);
        await _db.SaveChangesAsync();

        // Load the category server-side so CategoryName is populated in the
        // response — the client should never have to resolve it separately.
        await _db.Entry(jobRequest).Reference(j => j.ServiceCategory).LoadAsync();
        // Trigger 4-agent LangGraph workflow
        await _agentWorkflowService.DispatchWorkflowAsync(jobRequest);

        return ToDto(jobRequest);
    }

    public async Task<JobRequestResponseDto?> GetByIdAsync(Guid id, Guid requestingUserId, bool isRequesterAdmin)
    {
        var jobRequest = await _db.JobRequests
            .Include(j => j.ServiceCategory)
            .FirstOrDefaultAsync(j => j.Id == id);
        if (jobRequest is null)
            return null;

        var isOwner = jobRequest.CustomerId == requestingUserId;
        if (!isRequesterAdmin && !isOwner)
            return null;

        return ToDto(jobRequest);
    }

    public async Task<List<JobRequestResponseDto>> GetForCustomerAsync(Guid customerId)
    {
        var jobRequests = await _db.JobRequests
            .Include(j => j.ServiceCategory)
            .Where(j => j.CustomerId == customerId)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync();

        return jobRequests.Select(ToDto).ToList();
    }

    public async Task<PagedResult<JobRequestResponseDto>> GetForStaffAsync(
        JobRequestStatus? status,
        JobUrgency? urgency,
        bool sortDescending,
        int page,
        int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.JobRequests.Include(j => j.ServiceCategory).AsQueryable();

        if (status is not null)
            query = query.Where(j => j.Status == status);

        if (urgency is not null)
            query = query.Where(j => j.Urgency == urgency);

        var totalCount = await query.CountAsync();

        query = sortDescending
            ? query.OrderByDescending(j => j.CreatedAt)
            : query.OrderBy(j => j.CreatedAt);

        var pageItems = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<JobRequestResponseDto>(
            pageItems.Select(ToDto).ToList(),
            totalCount,
            page,
            pageSize);
    }

    private static JobRequestResponseDto ToDto(JobRequest j) => new(
        j.Id,
        j.ServiceCategoryId,
        j.ServiceCategory.Name,
        j.Description,
        j.PhotoUrls,
        j.Location,
        j.Urgency.ToString(),
        j.BudgetMin,
        j.BudgetMax,
        j.Status.ToString(),
        j.CustomerId,
        j.CreatedAt,
        j.UpdatedAt);
}
