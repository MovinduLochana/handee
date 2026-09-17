namespace handee.API.DTO;

public record ServiceCategoryResponseDto(
    Guid Id,
    string Name,
    decimal? PriceBandMin,
    decimal? PriceBandMax
);
