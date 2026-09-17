using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO.Review;

public record ReviewDto(
    Guid Id,
    Guid ProviderProfileId,
    Guid CustomerId,
    string CustomerName, // Usually resolved, e.g. from ApplicationUser.FirstName or similar, let's keep CustomerName
    string? CustomerProfilePictureUrl, // from ApplicationUser
    int Rating,
    string? Comment,
    List<string> PhotoUrls,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);

public record CreateReviewDto(
    [Required]
    [Range(1, 5)]
    int Rating,
    
    [MaxLength(1500)]
    string? Comment
);

public record UpdateReviewDto(
    [Required]
    [Range(1, 5)]
    int Rating,
    
    [MaxLength(1500)]
    string? Comment
);

// We should also have a generic PagedResult for returns, though SearchAsync might use it
public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
