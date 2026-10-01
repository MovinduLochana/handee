using handee.API.DTO;
using handee.API.DTO.Review;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Services;

public class ReviewService : IReviewService
{
    private readonly IReviewRepository _reviewRepository;
    private readonly IProviderProfileRepository _providerProfileRepository;
    private readonly IProviderTrustService _trustService;
    private readonly IStorageService _storageService;

    public ReviewService(
        IReviewRepository reviewRepository,
        IProviderProfileRepository providerProfileRepository,
        IProviderTrustService trustService,
        IStorageService storageService)
    {
        _reviewRepository = reviewRepository;
        _providerProfileRepository = providerProfileRepository;
        _trustService = trustService;
        _storageService = storageService;
    }

    public async Task<ReviewDto> AddReviewAsync(Guid providerProfileId, Guid customerId, CreateReviewDto dto, CancellationToken ct = default)
    {
        // Check if provider exists
        var profile = await _providerProfileRepository.GetByIdAsync(providerProfileId, ct)
                   ?? await _providerProfileRepository.GetByUserIdAsync(providerProfileId, ct);
        if (profile == null)
        {
            throw new KeyNotFoundException("Provider profile not found.");
        }
        var effectiveProfileId = profile.Id;

        // Check if customer already reviewed provider
        var existingReview = await _reviewRepository.GetByCustomerAndProviderAsync(customerId, profile.Id, ct)
                          ?? await _reviewRepository.GetByCustomerAndProviderAsync(customerId, providerProfileId, ct);
        if (existingReview != null)
        {
            throw new InvalidOperationException("Customer has already reviewed this provider.");
        }

        var review = new Review
        {
            ProviderProfileId = effectiveProfileId,
            CustomerId = customerId,
            Rating = dto.Rating,
            Comment = dto.Comment
        };

        await _reviewRepository.AddAsync(review, ct);
        await _reviewRepository.SaveChangesAsync(ct);
        
        // After save, the Review should have the Customer entity included? 
        // No, we might just fetch the user name later. But here for DTO mapping it's fine.
        var createdReview = await _reviewRepository.GetByIdAsync(review.Id, ct) ?? review;

        await RecalculateProviderRatingAsync(profile, ct);

        return MapToDto(createdReview);
    }

    public async Task<ReviewDto> UpdateReviewAsync(Guid reviewId, Guid customerId, UpdateReviewDto dto, CancellationToken ct = default)
    {
        var review = await _reviewRepository.GetByIdAsync(reviewId, ct);
        if (review == null) throw new KeyNotFoundException("Review not found.");
        
        if (review.CustomerId != customerId)
        {
            throw new UnauthorizedAccessException("Customer does not own this review.");
        }

        review.Rating = dto.Rating;
        review.Comment = dto.Comment;
        review.UpdatedAt = DateTimeOffset.UtcNow;

        await _reviewRepository.SaveChangesAsync(ct);

        var profile = await _providerProfileRepository.GetByIdAsync(review.ProviderProfileId, ct);
        if (profile != null)
        {
            await RecalculateProviderRatingAsync(profile, ct);
        }

        return MapToDto(review);
    }

    public async Task DeleteReviewAsync(Guid reviewId, Guid requesterId, bool isAdmin, CancellationToken ct = default)
    {
        var review = await _reviewRepository.GetByIdAsync(reviewId, ct);
        if (review == null) throw new KeyNotFoundException("Review not found.");
        
        if (!isAdmin && review.CustomerId != requesterId)
        {
            throw new UnauthorizedAccessException("You don't have permission to delete this review.");
        }

        var providerProfileId = review.ProviderProfileId;

        _reviewRepository.Remove(review);
        await _reviewRepository.SaveChangesAsync(ct);

        var profile = await _providerProfileRepository.GetByIdAsync(providerProfileId, ct);
        if (profile != null)
        {
            await RecalculateProviderRatingAsync(profile, ct);
        }
    }

    public async Task<PagedResult<ReviewDto>> GetReviewsForProviderAsync(Guid providerProfileId, int page, int pageSize, CancellationToken ct = default)
    {
        var profile = await _providerProfileRepository.GetByIdAsync(providerProfileId, ct)
                   ?? await _providerProfileRepository.GetByUserIdAsync(providerProfileId, ct);
        var effectiveProfileId = profile?.Id ?? providerProfileId;
        var skip = (page - 1) * pageSize;
        var (items, totalCount) = await _reviewRepository.GetReviewsForProviderAsync(effectiveProfileId, skip, pageSize, ct);

        var dtos = items.Select(MapToDto).ToList();
        return new PagedResult<ReviewDto>(dtos, totalCount, page, pageSize);
    }

    public async Task<ReviewDto> AddPhotoToReviewAsync(Guid reviewId, Guid customerId, Microsoft.AspNetCore.Http.IFormFile file, CancellationToken ct = default)
    {
        var review = await _reviewRepository.GetByIdAsync(reviewId, ct);
        if (review == null) throw new KeyNotFoundException("Review not found.");
        
        if (review.CustomerId != customerId)
        {
            throw new UnauthorizedAccessException("Customer does not own this review.");
        }

        var photoUrl = await _storageService.UploadAsync(file, "reviews", ct);
        
        if (review.PhotoUrls == null) review.PhotoUrls = [];
        review.PhotoUrls.Add(photoUrl);
        review.UpdatedAt = DateTimeOffset.UtcNow;
        
        await _reviewRepository.SaveChangesAsync(ct);
        
        return MapToDto(review);
    }

    private async Task RecalculateProviderRatingAsync(ProviderProfile profile, CancellationToken ct)
    {
        var (aggregate, count) = await _reviewRepository.GetProviderRatingAggregateAsync(profile.Id, ct);

        profile.RatingAggregate = aggregate;
        profile.TotalReviewCount = count;

        await _providerProfileRepository.SaveChangesAsync(ct);
        await _trustService.InvalidateCacheAsync(profile.Id, ct);
    }

    private static ReviewDto MapToDto(Review review)
    {
        // Assuming Customer is preloaded, if not we fall back to placeholders
        var customerName = review.Customer != null ? review.Customer.FullName : "Unknown Customer";
        
        // Ensure we properly map the CustomerProfilePictureUrl or default to omitted if property doesn't exist
        var profilePic = review.Customer?.ProfilePictureUrl; 
        
        return new ReviewDto(
            Id: review.Id,
            ProviderProfileId: review.ProviderProfileId,
            CustomerId: review.CustomerId,
            CustomerName: customerName,
            CustomerProfilePictureUrl: profilePic,
            Rating: review.Rating,
            Comment: review.Comment,
            PhotoUrls: review.PhotoUrls ?? [],
            CreatedAt: review.CreatedAt,
            UpdatedAt: review.UpdatedAt
        );
    }
}
