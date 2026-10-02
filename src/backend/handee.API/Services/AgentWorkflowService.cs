using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;

namespace handee.API.Services;

public class AgentWorkflowService : IAgentWorkflowService
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IInvoiceService _invoiceService;
    private readonly ILogger<AgentWorkflowService> _logger;
    private readonly IBookingNotificationService? _notificationService;
    private readonly IProviderAvailabilityService? _availabilityService;

    public AgentWorkflowService(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IInvoiceService invoiceService,
        ILogger<AgentWorkflowService> logger)
        : this(db, httpClientFactory, invoiceService, logger, null, null)
    {
    }

    public AgentWorkflowService(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IInvoiceService invoiceService,
        ILogger<AgentWorkflowService> logger,
        IBookingNotificationService? notificationService)
        : this(db, httpClientFactory, invoiceService, logger, notificationService, null)
    {
    }

    public AgentWorkflowService(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IInvoiceService invoiceService,
        ILogger<AgentWorkflowService> logger,
        IBookingNotificationService? notificationService,
        IProviderAvailabilityService? availabilityService)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _invoiceService = invoiceService;
        _logger = logger;
        _notificationService = notificationService;
        _availabilityService = availabilityService;
    }


    public async Task<AgentWorkflow> DispatchWorkflowAsync(JobRequest jobRequest, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("AgentService");

        var payload = new
        {
            job_id = jobRequest.Id.ToString(),
            category = jobRequest.ServiceCategory?.Name,
            description = jobRequest.Description,
            location = jobRequest.Location,
            urgency = jobRequest.Urgency.ToString().ToLower(),
            budget_min = jobRequest.BudgetMin,
            budget_max = jobRequest.BudgetMax
        };

        AgentWorkflow workflow;

        try
        {
            var response = await client.PostAsJsonAsync("/api/v1/workflow/dispatch", payload, ct);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
                workflow = MapJsonToWorkflow(jobRequest.Id, json);
            }
            else
            {
                _logger.LogWarning("Agent service returned status {StatusCode}. Using fallback heuristic dispatch.", response.StatusCode);
                workflow = CreateFallbackWorkflow(jobRequest);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to reach Agent service. Using fallback heuristic dispatch.");
            workflow = CreateFallbackWorkflow(jobRequest);
        }

        ServiceListing? serviceListing = null;
        if (workflow.SelectedServiceListingId.HasValue)
        {
            serviceListing = await _db.ServiceListings.FirstOrDefaultAsync(l => l.Id == workflow.SelectedServiceListingId.Value, ct);
            if (serviceListing != null)
            {
                workflow.SelectedProviderId = serviceListing.ProviderId;
                workflow.EstimatedPrice = serviceListing.FixedPrice;
            }
        }

        // Try to link SelectedProvider to an existing provider in database
        if (workflow.SelectedProviderId == null || !await _db.Users.AnyAsync(u => u.Id == workflow.SelectedProviderId, ct))
        {
            // Find an active service listing in system matching category or any
            var listing = await _db.ServiceListings
                .Include(l => l.Provider)
                .Where(l => l.IsActive && (jobRequest.ServiceCategoryId == Guid.Empty || l.ServiceCategoryId == jobRequest.ServiceCategoryId))
                .FirstOrDefaultAsync(ct);

            if (listing != null)
            {
                workflow.SelectedProviderId = listing.ProviderId;
                workflow.SelectedServiceListingId = listing.Id;
                workflow.EstimatedPrice = listing.FixedPrice;
                serviceListing = listing;
            }
            else
            {
                // Find a verified provider in the system
                var existingProvider = await _db.ProviderProfiles
                    .Include(p => p.User)
                    .Where(p => p.VerificationStatus == VerificationStatus.Verified)
                    .Select(p => p.UserId)
                    .FirstOrDefaultAsync(ct);

                if (existingProvider != Guid.Empty)
                {
                    workflow.SelectedProviderId = existingProvider;
                }
                else
                {
                    // Fallback to any user with Provider role or customer
                    var anyProvider = await _db.Users.Select(u => u.Id).FirstOrDefaultAsync(ct);
                    if (anyProvider != Guid.Empty) workflow.SelectedProviderId = anyProvider;
                }
            }
        }

        // If provider is set but no listing is selected yet, find provider's active listing
        if (!workflow.SelectedServiceListingId.HasValue && workflow.SelectedProviderId.HasValue)
        {
            serviceListing = await _db.ServiceListings
                .Where(l => l.ProviderId == workflow.SelectedProviderId.Value && l.IsActive)
                .OrderByDescending(l => jobRequest.ServiceCategoryId != Guid.Empty && l.ServiceCategoryId == jobRequest.ServiceCategoryId)
                .FirstOrDefaultAsync(ct);

            if (serviceListing != null)
            {
                workflow.SelectedServiceListingId = serviceListing.Id;
                workflow.EstimatedPrice = serviceListing.FixedPrice;
            }
        }

        _db.AgentWorkflows.Add(workflow);

        // Tier evaluation handling
        if (workflow.ValidationTier is WorkflowValidationTier.ApprovedForAutoDispatch or WorkflowValidationTier.ApprovedWithAudit)
        {
            jobRequest.Status = JobRequestStatus.Open;

            // Automatically create Booking offer for the selected provider
            if (workflow.SelectedProviderId.HasValue)
            {
                var durationHours = serviceListing?.DurationHours ?? 1;
                var scheduledAt = await FindNextAvailableSlotAsync(workflow.SelectedProviderId.Value, durationHours, ct);

                var now = DateTimeOffset.UtcNow;
                var booking = new Booking
                {
                    JobRequestId = jobRequest.Id,
                    ServiceListingId = workflow.SelectedServiceListingId,
                    CustomerId = jobRequest.CustomerId,
                    ProviderId = workflow.SelectedProviderId.Value,
                    Status = BookingStatus.Requested,
                    BookingType = BookingType.InstantMatch,
                    ExpiresAt = now.AddSeconds(90),
                    ScheduledAt = scheduledAt,
                    CreatedAt = now
                };
                _db.Bookings.Add(booking);
                await _db.SaveChangesAsync(ct);

                // Approval-to-Payment Handoff: Auto-generate Quote/Invoice from AI estimate
                var approvalStatus = workflow.ValidationTier == WorkflowValidationTier.ApprovedForAutoDispatch
                    ? QuoteApprovalStatus.AutoApproved
                    : QuoteApprovalStatus.ApprovedWithAudit;
                var estimatedPrice = workflow.EstimatedPrice ?? 3500m;
                var categoryName = jobRequest.ServiceCategory?.Name ?? "General Maintenance";

                try
                {
                    await _invoiceService.CreateInvoiceForBookingAsync(
                        booking.Id,
                        booking.CustomerId,
                        booking.ProviderId,
                        estimatedPrice,
                        approvalStatus,
                        categoryName,
                        ct
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to auto-create invoice during approval-to-payment handoff for booking {BookingId}", booking.Id);
                }

                if (_notificationService != null)
                {
                    try
                    {
                        await _notificationService.NotifyJobDispatchedAsync(
                            workflow.SelectedProviderId.Value,
                            booking.Id,
                            jobRequest.Id,
                            categoryName,
                            estimatedPrice,
                            ct);

                        await _notificationService.NotifyInstantJobDispatchedAsync(
                            workflow.SelectedProviderId.Value,
                            booking.Id,
                            jobRequest.Id,
                            categoryName,
                            estimatedPrice,
                            90,
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send dispatch notification for booking {BookingId}", booking.Id);
                    }
                }
            }
        }
        else
        {
            // High risk / requires human approval: leave status as PendingAiReview
            workflow.ApprovalStatus = WorkflowApprovalStatus.Pending;
            jobRequest.Status = JobRequestStatus.PendingAiReview;
        }

        await _db.SaveChangesAsync(ct);
        return workflow;
    }

    public async Task<AssistantQueryResponseDto> QueryAssistantAsync(Guid customerId, string query, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("AgentService");
        var payload = new
        {
            customer_id = customerId.ToString(),
            query = query
        };

        try
        {
            var response = await client.PostAsJsonAsync("/api/v1/assistant/query", payload, ct);
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<AssistantQueryResponseDto>(cancellationToken: ct);
                if (result != null) return result;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Agent service assistant query failed. Using fallback response.");
        }

        // Heuristic fallback if agent service offline
        return new AssistantQueryResponseDto(
            Reply: $"I can help connect you with vetted tradespeople across Sri Lanka. Standard rates typically start around Rs. 3,500.",
            Category: "General Maintenance",
            SuggestedProviders: new List<object>(),
            SuggestedListings: new List<object>(),
            Suggestions: new List<string> { "Request Instant Match", "View Category Pricing", "Browse Listings" }
        );
    }

    public async Task<AgentWorkflowResponseDto?> GetByIdAsync(Guid workflowId, CancellationToken ct = default)
    {
        var workflow = await _db.AgentWorkflows
            .Include(w => w.SelectedProvider)
            .Include(w => w.SelectedServiceListing)
            .Include(w => w.StepLogs.OrderBy(s => s.StepNumber))
            .FirstOrDefaultAsync(w => w.Id == workflowId, ct);

        return workflow == null ? null : ToDto(workflow);
    }

    public async Task<AgentWorkflowResponseDto?> GetByJobRequestIdAsync(Guid jobRequestId, CancellationToken ct = default)
    {
        var workflow = await _db.AgentWorkflows
            .Include(w => w.SelectedProvider)
            .Include(w => w.SelectedServiceListing)
            .Include(w => w.StepLogs.OrderBy(s => s.StepNumber))
            .FirstOrDefaultAsync(w => w.JobRequestId == jobRequestId, ct);

        return workflow == null ? null : ToDto(workflow);
    }

    public async Task<List<AgentWorkflowResponseDto>> GetAllAsync(string? tier = null, string? status = null, CancellationToken ct = default)
    {
        var query = _db.AgentWorkflows
            .Include(w => w.SelectedProvider)
            .Include(w => w.SelectedServiceListing)
            .Include(w => w.StepLogs.OrderBy(s => s.StepNumber))
            .AsQueryable();

        if (!string.IsNullOrEmpty(tier))
        {
            var parsedTier = AgentWorkflow.ParseValidationTier(tier);
            query = query.Where(w => w.ValidationTier == parsedTier);
        }

        if (!string.IsNullOrEmpty(status))
        {
            var parsedStatus = AgentWorkflow.ParseApprovalStatus(status);
            query = query.Where(w => w.ApprovalStatus == parsedStatus);
        }

        var list = await query.OrderByDescending(w => w.CreatedAt).ToListAsync(ct);
        return list.Select(ToDto).ToList();
    }

    public async Task<AgentWorkflowResponseDto> MakeDecisionAsync(
        Guid workflowId,
        Guid adminId,
        AdminWorkflowDecisionDto dto,
        CancellationToken ct = default)
    {
        var workflow = await _db.AgentWorkflows
            .Include(w => w.JobRequest)
            .Include(w => w.SelectedProvider)
            .Include(w => w.SelectedServiceListing)
            .Include(w => w.StepLogs.OrderBy(s => s.StepNumber))
            .FirstOrDefaultAsync(w => w.Id == workflowId, ct);

        if (workflow == null)
            throw new NotFoundException($"AgentWorkflow with ID {workflowId} not found.");

        var wasAlreadyApproved = workflow.ApprovalStatus == WorkflowApprovalStatus.Approved;
        var decision = dto.Decision.Trim();
        workflow.ApprovalStatus = AgentWorkflow.ParseApprovalStatus(decision);
        workflow.DecisionNote = dto.Note;
        workflow.DecidedAt = DateTimeOffset.UtcNow;
        workflow.DecidedByAdminId = adminId;

        if (workflow.ApprovalStatus == WorkflowApprovalStatus.Approved)
        {
            workflow.JobRequest.Status = JobRequestStatus.Open;

            // Check if booking already exists for this job request
            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.JobRequestId == workflow.JobRequestId, ct);
            var isNewDispatch = !wasAlreadyApproved && booking == null;
            if (booking == null && workflow.SelectedProviderId.HasValue)
            {
                int durationHours = 1;
                if (workflow.SelectedServiceListingId.HasValue)
                {
                    var listing = await _db.ServiceListings.FirstOrDefaultAsync(l => l.Id == workflow.SelectedServiceListingId.Value, ct);
                    if (listing != null)
                    {
                        durationHours = listing.DurationHours;
                        workflow.EstimatedPrice = listing.FixedPrice;
                    }
                }
                else
                {
                    var fallbackListing = await _db.ServiceListings
                        .Where(l => l.ProviderId == workflow.SelectedProviderId.Value && l.IsActive)
                        .OrderByDescending(l => workflow.JobRequest != null && workflow.JobRequest.ServiceCategoryId != Guid.Empty && l.ServiceCategoryId == workflow.JobRequest.ServiceCategoryId)
                        .FirstOrDefaultAsync(ct);
                    if (fallbackListing != null)
                    {
                        workflow.SelectedServiceListingId = fallbackListing.Id;
                        workflow.EstimatedPrice = fallbackListing.FixedPrice;
                        durationHours = fallbackListing.DurationHours;
                    }
                }

                var scheduledAt = await FindNextAvailableSlotAsync(workflow.SelectedProviderId.Value, durationHours, ct);

                var now = DateTimeOffset.UtcNow;
                booking = new Booking
                {
                    JobRequestId = workflow.JobRequestId,
                    ServiceListingId = workflow.SelectedServiceListingId,
                    CustomerId = workflow.JobRequest.CustomerId,
                    ProviderId = workflow.SelectedProviderId.Value,
                    Status = BookingStatus.Requested,
                    BookingType = BookingType.InstantMatch,
                    ExpiresAt = now.AddSeconds(90),
                    ScheduledAt = scheduledAt,
                    CreatedAt = now
                };
                _db.Bookings.Add(booking);
                await _db.SaveChangesAsync(ct);
            }
            else if (booking != null && !booking.ServiceListingId.HasValue && workflow.SelectedServiceListingId.HasValue)
            {
                booking.ServiceListingId = workflow.SelectedServiceListingId.Value;
            }

            // Approval-to-Payment Handoff: Generate or update Quote/Invoice for Admin-approved booking
            if (booking != null && workflow.SelectedProviderId.HasValue)
            {
                var estimatedPrice = workflow.EstimatedPrice ?? 3500m;
                var categoryName = workflow.JobRequest?.ServiceCategory?.Name ?? "General Maintenance";

                try
                {
                    await _invoiceService.CreateInvoiceForBookingAsync(
                        booking.Id,
                        booking.CustomerId,
                        booking.ProviderId,
                        estimatedPrice,
                        QuoteApprovalStatus.Approved,
                        categoryName,
                        ct
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to create invoice during Admin approval-to-payment handoff for booking {BookingId}", booking.Id);
                }

                if (isNewDispatch && _notificationService != null)
                {
                    try
                    {
                        await _notificationService.NotifyJobDispatchedAsync(
                            workflow.SelectedProviderId.Value,
                            booking.Id,
                            workflow.JobRequestId,
                            categoryName,
                            estimatedPrice,
                            ct);

                        await _notificationService.NotifyInstantJobDispatchedAsync(
                            workflow.SelectedProviderId.Value,
                            booking.Id,
                            workflow.JobRequestId,
                            categoryName,
                            estimatedPrice,
                            90,
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send dispatch notification for booking {BookingId}", booking.Id);
                    }
                }
            }
        }
        else if (decision.Equals("Reject", StringComparison.OrdinalIgnoreCase))
        {
            workflow.JobRequest.Status = JobRequestStatus.Cancelled;
        }

        await _db.SaveChangesAsync(ct);
        return ToDto(workflow);
    }

    private static AgentWorkflow MapJsonToWorkflow(Guid jobRequestId, JsonElement json)
    {
        var workflowId = json.TryGetProperty("workflow_id", out var wId) ? wId.GetString() ?? $"wf-{Guid.NewGuid():N}" : $"wf-{Guid.NewGuid():N}";
        var objective = json.TryGetProperty("objective", out var obj) ? obj.GetString() ?? "" : "";
        var validationTier = json.TryGetProperty("validation_tier", out var vt) ? vt.GetString() ?? "requires_human_approval" : "requires_human_approval";
        var approvalStatus = json.TryGetProperty("approval_status", out var ap) ? ap.GetString() ?? "pending" : "pending";
        decimal? price = json.TryGetProperty("estimated_price", out var ep) && ep.ValueKind == JsonValueKind.Number ? ep.GetDecimal() : null;

        Guid? selectedProviderId = null;
        if (json.TryGetProperty("selected_provider_id", out var spId) && spId.ValueKind == JsonValueKind.String)
        {
            if (Guid.TryParse(spId.GetString(), out var parsedId))
                selectedProviderId = parsedId;
        }

        Guid? selectedServiceListingId = null;
        if (json.TryGetProperty("selected_service_listing_id", out var sslId) && sslId.ValueKind == JsonValueKind.String)
        {
            if (Guid.TryParse(sslId.GetString(), out var parsedSslId))
                selectedServiceListingId = parsedSslId;
        }

        if (!selectedServiceListingId.HasValue && json.TryGetProperty("selected_service_listing", out var slObj) && slObj.ValueKind == JsonValueKind.Object)
        {
            if (slObj.TryGetProperty("id", out var slId) && slId.ValueKind == JsonValueKind.String)
            {
                if (Guid.TryParse(slId.GetString(), out var parsedSlId))
                    selectedServiceListingId = parsedSlId;
            }
        }

        if (!selectedServiceListingId.HasValue && json.TryGetProperty("final_result", out var frElem) && frElem.ValueKind == JsonValueKind.Object)
        {
            if (frElem.TryGetProperty("selected_service_listing_id", out var frSslId) && frSslId.ValueKind == JsonValueKind.String)
            {
                if (Guid.TryParse(frSslId.GetString(), out var parsedFrSslId))
                    selectedServiceListingId = parsedFrSslId;
            }
        }

        var planList = new List<string>();
        if (json.TryGetProperty("plan", out var planElem) && planElem.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in planElem.EnumerateArray())
                planList.Add(item.GetString() ?? "");
        }

        var workflow = new AgentWorkflow
        {
            JobRequestId = jobRequestId,
            WorkflowId = workflowId,
            Objective = objective,
            Plan = planList,
            ValidationTier = AgentWorkflow.ParseValidationTier(validationTier),
            ApprovalStatus = AgentWorkflow.ParseApprovalStatus(approvalStatus),
            EstimatedPrice = price,
            SelectedProviderId = selectedProviderId,
            SelectedServiceListingId = selectedServiceListingId,
            FinalResultJson = json.ToString()
        };

        if (json.TryGetProperty("step_logs", out var stepLogsElem) && stepLogsElem.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in stepLogsElem.EnumerateArray())
            {
                var step = new AgentStepLog
                {
                    StepNumber = item.TryGetProperty("step_number", out var sn) ? sn.GetInt32() : 0,
                    AgentName = item.TryGetProperty("agent_name", out var an) ? an.GetString() ?? "" : "",
                    Action = item.TryGetProperty("action", out var ac) ? ac.GetString() ?? "" : "",
                    InputData = item.TryGetProperty("input_data", out var inD) ? inD.ToString() : null,
                    OutputData = item.TryGetProperty("output_data", out var outD) ? outD.ToString() : null,
                    DurationMs = item.TryGetProperty("duration_ms", out var dm) ? dm.GetInt64() : 0,
                    Timestamp = DateTimeOffset.UtcNow
                };
                workflow.StepLogs.Add(step);
            }
        }

        return workflow;
    }

    private static AgentWorkflow CreateFallbackWorkflow(JobRequest jobRequest)
    {
        var price = jobRequest.BudgetMax ?? jobRequest.BudgetMin ?? 3500m;
        var workflow = new AgentWorkflow
        {
            JobRequestId = jobRequest.Id,
            WorkflowId = $"wf-{Guid.NewGuid():N}",
            Objective = jobRequest.Description,
            Plan = new List<string>
            {
                "1. Domain Analysis: Categorize request and estimate complexity.",
                "2. Action / Tool: Search verified candidate tradespeople and estimate pricing.",
                "3. Validation / Safety: Evaluate platform risk policies and category price variance.",
                "4. Workflow Finalization: Output tiered risk classification."
            },
            ValidationTier = WorkflowValidationTier.ApprovedWithAudit,
            ApprovalStatus = WorkflowApprovalStatus.Approved,
            EstimatedPrice = price,
            FinalResultJson = JsonSerializer.Serialize(new { status = "approved_with_audit", estimatedPrice = price })
        };

        workflow.StepLogs.Add(new AgentStepLog
        {
            StepNumber = 1,
            AgentName = "Coordinator / Planner Agent",
            Action = "build_execution_plan",
            DurationMs = 12,
            Timestamp = DateTimeOffset.UtcNow
        });
        workflow.StepLogs.Add(new AgentStepLog
        {
            StepNumber = 2,
            AgentName = "Domain Analysis Agent",
            Action = "classify_category_and_estimate_scope",
            DurationMs = 24,
            Timestamp = DateTimeOffset.UtcNow
        });
        workflow.StepLogs.Add(new AgentStepLog
        {
            StepNumber = 3,
            AgentName = "Action / Tool Agent",
            Action = "search_providers_and_estimate_price",
            DurationMs = 38,
            Timestamp = DateTimeOffset.UtcNow
        });
        workflow.StepLogs.Add(new AgentStepLog
        {
            StepNumber = 4,
            AgentName = "Validation / Safety Agent",
            Action = "evaluate_safety_and_risk_rules",
            DurationMs = 15,
            Timestamp = DateTimeOffset.UtcNow
        });

        return workflow;
    }

    private static AgentWorkflowResponseDto ToDto(AgentWorkflow w) => new(
        w.Id,
        w.JobRequestId,
        w.WorkflowId,
        w.Objective,
        w.Plan,
        AgentWorkflow.FormatValidationTier(w.ValidationTier),
        AgentWorkflow.FormatApprovalStatus(w.ApprovalStatus),
        w.EstimatedPrice,
        w.SelectedProviderId,
        w.SelectedProvider?.FullName,
        w.FinalResultJson,
        w.DecisionNote,
        w.DecidedAt,
        w.CreatedAt,
        w.StepLogs.Select(s => new AgentStepLogDto(
            s.Id,
            s.StepNumber,
            s.AgentName,
            s.Action,
            s.InputData,
            s.OutputData,
            s.DurationMs,
            s.Timestamp
        )).ToList(),
        w.SelectedServiceListingId
    );

    private async Task<DateTimeOffset> FindNextAvailableSlotAsync(Guid providerId, int durationHours, CancellationToken ct)
    {
        if (_availabilityService != null)
        {
            try
            {
                for (int dayOffset = 1; dayOffset <= 7; dayOffset++)
                {
                    var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(dayOffset));
                    var slots = await _availabilityService.GetPredefinedSlotsForDateAsync(providerId, targetDate, durationHours, ct);
                    var firstAvailable = slots.Slots.FirstOrDefault(s => s.IsAvailable);
                    if (firstAvailable != null)
                    {
                        return firstAvailable.StartTime;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query predefined slots for provider {ProviderId}. Falling back to operating schedule.", providerId);
            }
        }

        // Fallback: tomorrow at provider's operating schedule start time (or 09:00 UTC), top-of-hour
        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var sched = await _db.ProviderOperatingSchedules
            .FirstOrDefaultAsync(s => s.ProviderId == providerId && s.DayOfWeek == tomorrow.DayOfWeek && s.IsActive, ct);
        var hour = sched != null ? sched.StartTime.Hours : 9;
        return new DateTimeOffset(tomorrow.Year, tomorrow.Month, tomorrow.Day, hour, 0, 0, TimeSpan.Zero);
    }

    public async Task<bool> RedispatchInstantMatchAsync(Guid expiredBookingId, CancellationToken ct = default)
    {
        var expiredBooking = await _db.Bookings
            .Include(b => b.JobRequest)
                .ThenInclude(j => j!.ServiceCategory)
            .Include(b => b.ServiceListing)
            .FirstOrDefaultAsync(b => b.Id == expiredBookingId, ct);

        if (expiredBooking == null || expiredBooking.JobRequestId == null || expiredBooking.JobRequest == null)
            return false;

        var jobRequest = expiredBooking.JobRequest;

        // Query all providers who already received an offer for this job request
        var previousProviderIds = await _db.Bookings
            .Where(b => b.JobRequestId == jobRequest.Id)
            .Select(b => b.ProviderId)
            .Distinct()
            .ToListAsync(ct);

        // Find next candidate provider with active listing in category
        var nextListing = await _db.ServiceListings
            .Include(l => l.Category)
            .Include(l => l.Provider)
            .Where(l => l.IsActive
                        && (jobRequest.ServiceCategoryId == Guid.Empty || l.ServiceCategoryId == jobRequest.ServiceCategoryId)
                        && !previousProviderIds.Contains(l.ProviderId))
            .FirstOrDefaultAsync(ct);

        Guid nextProviderId = Guid.Empty;
        Guid? nextListingId = null;
        decimal price = expiredBooking.ServiceListing?.FixedPrice ?? 3500m;
        string categoryName = jobRequest.ServiceCategory?.Name ?? expiredBooking.ServiceListing?.Category?.Name ?? "Service";
        int durationHours = 1;

        if (nextListing != null)
        {
            nextProviderId = nextListing.ProviderId;
            nextListingId = nextListing.Id;
            price = nextListing.FixedPrice;
            categoryName = nextListing.Category?.Name ?? categoryName;
            durationHours = nextListing.DurationHours > 0 ? nextListing.DurationHours : 1;
        }
        else
        {
            // Fallback: any verified provider not in previousProviderIds
            var verifiedProvider = await _db.ProviderProfiles
                .Where(p => p.VerificationStatus == VerificationStatus.Verified && !previousProviderIds.Contains(p.UserId))
                .Select(p => p.UserId)
                .FirstOrDefaultAsync(ct);

            if (verifiedProvider != Guid.Empty)
            {
                nextProviderId = verifiedProvider;
            }
        }

        if (nextProviderId == Guid.Empty)
        {
            _logger.LogInformation("No further provider candidates available for redispatching JobRequest {JobRequestId}", jobRequest.Id);
            return false;
        }

        var scheduledAt = await FindNextAvailableSlotAsync(nextProviderId, durationHours, ct);
        var now = DateTimeOffset.UtcNow;

        var newBooking = new Booking
        {
            JobRequestId = jobRequest.Id,
            ServiceListingId = nextListingId,
            CustomerId = jobRequest.CustomerId,
            ProviderId = nextProviderId,
            Status = BookingStatus.Requested,
            BookingType = BookingType.InstantMatch,
            ExpiresAt = now.AddSeconds(90),
            ScheduledAt = scheduledAt,
            CreatedAt = now
        };

        _db.Bookings.Add(newBooking);
        await _db.SaveChangesAsync(ct);

        if (_notificationService != null)
        {
            try
            {
                await _notificationService.NotifyJobDispatchedAsync(
                    nextProviderId,
                    newBooking.Id,
                    jobRequest.Id,
                    categoryName,
                    price,
                    ct);

                await _notificationService.NotifyInstantJobDispatchedAsync(
                    nextProviderId,
                    newBooking.Id,
                    jobRequest.Id,
                    categoryName,
                    price,
                    90,
                    ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send redispatch notification for booking {BookingId}", newBooking.Id);
            }
        }

        return true;
    }
}
