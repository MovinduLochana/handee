using handee.API.DTO.Review;
using handee.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace handee.API.Controllers;

[ApiController]
[Route("api/providers/{providerId:guid}/reviews")]
public class ReviewController : ControllerBase
{
    private readonly ReviewService _reviewService;

    public ReviewController(ReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ReviewDto>>> GetReviews(
        Guid providerId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await _reviewService.GetReviewsForProviderAsync(providerId, Math.Max(1, page), Math.Max(1, Math.Min(50, pageSize)), ct);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReviewDto>> AddReview(
        Guid providerId,
        [FromBody] CreateReviewDto dto,
        CancellationToken ct = default)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var customerId))
        {
            return Unauthorized();
        }

        try
        {
            var review = await _reviewService.AddReviewAsync(providerId, customerId, dto, ct);
            return CreatedAtAction(nameof(GetReviews), new { providerId }, review);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}
