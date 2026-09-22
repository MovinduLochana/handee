namespace handee.API.DTO;

public record JobRequestResponseDto(
    Guid Id,
    Guid ServiceCategoryId,
    string CategoryName,
    string Description,
    IList<string> PhotoUrls,
    string Location,
    string Urgency,
    decimal? BudgetMin,
    decimal? BudgetMax,
    string Status,
    Guid CustomerId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);
