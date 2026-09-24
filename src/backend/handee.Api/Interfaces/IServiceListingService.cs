using handee.API.DTO.ServiceListing;
using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IServiceListingService
{
    Task<ServiceListingResponseDto> CreateListingAsync(Guid providerId, CreateServiceListingDto dto);
    Task<ServiceListingResponseDto> UpdateListingAsync(Guid listingId, Guid providerId, UpdateServiceListingDto dto);
    Task<IEnumerable<ServiceListingResponseDto>> GetProviderListingsAsync(Guid providerId);
    Task<IEnumerable<ServiceListingResponseDto>> SearchActiveListingsAsync(string? query, Guid? categoryId);
    Task DeleteListingAsync(Guid listingId, Guid providerId);
    Task<ServiceListingResponseDto> GetListingByIdAsync(Guid listingId);
    Task ToggleActiveStatusAsync(Guid providerId, Guid listingId, bool isActive);
    Task<IEnumerable<ServiceListingResponseDto>> GetListingsByProviderProfileIdAsync(Guid providerProfileId);
}
