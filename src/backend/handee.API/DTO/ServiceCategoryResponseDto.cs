namespace handee.API.DTO;

public record ServiceCategoryResponseDto(
    Guid Id,
    string Name,
    string? IconUrl,
    decimal? PriceBandMin,
    decimal? PriceBandMax
);
