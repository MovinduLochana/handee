using handee.API.DTO;
using handee.API.DTO.Review;
using Microsoft.AspNetCore.Http;

namespace handee.API.Interfaces;

public interface IReviewService
{
    Task<ReviewDto> AddReviewAsync(Guid providerProfileId, Guid customerId, CreateReviewDto dto, CancellationToken ct = default);
    Task<ReviewDto> UpdateReviewAsync(Guid reviewId, Guid customerId, UpdateReviewDto dto, CancellationToken ct = default);
    Task DeleteReviewAsync(Guid reviewId, Guid requesterId, bool isAdmin, CancellationToken ct = default);
    Task<PagedResult<ReviewDto>> GetReviewsForProviderAsync(Guid providerProfileId, int page, int pageSize, CancellationToken ct = default);
    Task<ReviewDto> AddPhotoToReviewAsync(Guid reviewId, Guid customerId, IFormFile file, CancellationToken ct = default);
}
