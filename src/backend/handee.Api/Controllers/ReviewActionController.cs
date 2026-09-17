using handee.API.DTO.Review;
using handee.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace handee.API.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewActionController : ControllerBase
{
    private readonly ReviewService _reviewService;

    public ReviewActionController(ReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReviewDto>> UpdateReview(
        Guid id,
        [FromBody] UpdateReviewDto dto,
        CancellationToken ct = default)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var customerId))
        {
            return Unauthorized();
        }

        var review = await _reviewService.UpdateReviewAsync(id, customerId, dto, ct);
        return Ok(review);
    }

    [HttpPost("{id:guid}/photos")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReviewDto>> AddPhoto(
        Guid id,
        IFormFile file,
        CancellationToken ct = default)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var customerId))
        {
            return Unauthorized();
        }

        var review = await _reviewService.AddPhotoToReviewAsync(id, customerId, file, ct);
        return Ok(review);
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(Guid id, CancellationToken ct = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var requesterId))
        {
            return Unauthorized();
        }

        var isAdmin = User.IsInRole("Admin");

        await _reviewService.DeleteReviewAsync(id, requesterId, isAdmin, ct);
        return NoContent();
    }
}
