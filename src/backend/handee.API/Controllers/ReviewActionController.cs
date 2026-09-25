using handee.API.Common.Extensions;
using handee.API.DTO.Review;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace handee.API.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewActionController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewActionController(IReviewService reviewService)
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
        var customerId = User.GetUserId();
        if (customerId is null)
        {
            return Unauthorized();
        }

        var review = await _reviewService.UpdateReviewAsync(id, customerId.Value, dto, ct);
        return Ok(review);
    }

    [HttpPost("{id:guid}/photos")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReviewDto>> AddPhoto(
        Guid id,
        IFormFile file,
        CancellationToken ct = default)
    {
        var customerId = User.GetUserId();
        if (customerId is null)
        {
            return Unauthorized();
        }

        var review = await _reviewService.AddPhotoToReviewAsync(id, customerId.Value, file, ct);
        return Ok(review);
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(Guid id, CancellationToken ct = default)
    {
        var requesterId = User.GetUserId();
        if (requesterId is null)
        {
            return Unauthorized();
        }

        var isAdmin = User.IsInRole("Admin");

        await _reviewService.DeleteReviewAsync(id, requesterId.Value, isAdmin, ct);
        return NoContent();
    }
}
