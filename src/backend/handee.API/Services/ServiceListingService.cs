using handee.API.Data;
using handee.API.DTO.ServiceListing;
using handee.API.Entities;
using handee.API.Exceptions;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Services;

public class ServiceListingService : IServiceListingService
{
    private readonly AppDbContext _context;

    public ServiceListingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ServiceListingResponseDto> CreateListingAsync(Guid providerId, CreateServiceListingDto dto)
    {
        if (dto.DurationHours < 1 || dto.DurationHours > 8)
            throw new ValidationException("Service duration must be between 1 and 8 hours.");

        var category = await _context.ServiceCategories.FindAsync(dto.ServiceCategoryId);
        if (category == null)
            throw new NotFoundException($"ServiceCategory with ID {dto.ServiceCategoryId} not found.");

        var listing = new ServiceListing
        {
            ProviderId = providerId,
            ServiceCategoryId = dto.ServiceCategoryId,
            Title = dto.Title,
            Description = dto.Description,
            Scope = dto.Scope,
            Availability = dto.Availability,
            FixedPrice = dto.FixedPrice,
            DurationHours = dto.DurationHours,
            IsActive = true
        };

        _context.ServiceListings.Add(listing);
        await _context.SaveChangesAsync();

        return await GetListingByIdAsync(listing.Id);
    }

    public async Task<ServiceListingResponseDto> UpdateListingAsync(Guid listingId, Guid providerId, UpdateServiceListingDto dto)
    {
        if (dto.DurationHours < 1 || dto.DurationHours > 8)
            throw new ValidationException("Service duration must be between 1 and 8 hours.");

        var listing = await _context.ServiceListings.FirstOrDefaultAsync(l => l.Id == listingId && l.ProviderId == providerId);
        
        if (listing == null)
            throw new NotFoundException($"ServiceListing with ID {listingId} not found or you don't have access.");

        listing.ServiceCategoryId = dto.ServiceCategoryId;
        listing.Title = dto.Title;
        listing.Description = dto.Description;
        listing.Scope = dto.Scope;
        listing.Availability = dto.Availability;
        listing.FixedPrice = dto.FixedPrice;
        listing.DurationHours = dto.DurationHours;
        listing.IsActive = dto.IsActive;
        listing.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();
        return await GetListingByIdAsync(listingId);
    }

    public async Task<IEnumerable<ServiceListingResponseDto>> GetProviderListingsAsync(Guid providerId)
    {
        return await _context.ServiceListings
            .Include(l => l.Category)
            .Include(l => l.Provider)
            .Where(l => l.ProviderId == providerId)
            .Select(l => MapToDto(l))
            .ToListAsync();
    }

    public async Task<IEnumerable<ServiceListingResponseDto>> GetListingsByProviderProfileIdAsync(Guid providerProfileId)
    {
        var profileUserId = await _context.ProviderProfiles
            .Where(p => p.Id == providerProfileId || p.UserId == providerProfileId)
            .Select(p => (Guid?)p.UserId)
            .FirstOrDefaultAsync();

        if (profileUserId == null)
        {
            return await GetProviderListingsAsync(providerProfileId);
        }

        return await GetProviderListingsAsync(profileUserId.Value);
    }

    public async Task<ServiceListingResponseDto> GetListingByIdAsync(Guid listingId)
    {
        var listing = await _context.ServiceListings
            .Include(l => l.Category)
            .Include(l => l.Provider)
            .FirstOrDefaultAsync(l => l.Id == listingId);

        if (listing == null)
            throw new NotFoundException($"ServiceListing with ID {listingId} not found.");

        return MapToDto(listing);
    }

    public async Task<IEnumerable<ServiceListingResponseDto>> SearchActiveListingsAsync(string? query, Guid? categoryId)
    {
        var queryable = _context.ServiceListings
            .Include(l => l.Category)
            .Include(l => l.Provider)
            .Where(l => l.IsActive);

        if (categoryId.HasValue)
        {
            queryable = queryable.Where(l => l.ServiceCategoryId == categoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim().ToLower();
            queryable = queryable.Where(l =>
                l.Title.ToLower().Contains(term) ||
                l.Description.ToLower().Contains(term) ||
                (l.Category != null && l.Category.Name.ToLower().Contains(term)) ||
                (l.Provider != null && l.Provider.FullName.ToLower().Contains(term)));
        }

        var listings = await queryable.ToListAsync();
        return listings.Select(MapToDto);
    }

    public async Task DeleteListingAsync(Guid listingId, Guid providerId)
    {
        var listing = await _context.ServiceListings.FirstOrDefaultAsync(l => l.Id == listingId && l.ProviderId == providerId);
        if (listing == null)
            throw new NotFoundException($"ServiceListing with ID {listingId} not found or you don't have access.");

        _context.ServiceListings.Remove(listing);
        await _context.SaveChangesAsync();
    }

    public async Task ToggleActiveStatusAsync(Guid providerId, Guid listingId, bool isActive)
    {
        var listing = await _context.ServiceListings.FirstOrDefaultAsync(l => l.Id == listingId && l.ProviderId == providerId);
        if (listing == null)
            throw new NotFoundException($"ServiceListing with ID {listingId} not found or you don't have access.");

        listing.IsActive = isActive;
        listing.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();
    }

    private static ServiceListingResponseDto MapToDto(ServiceListing listing)
    {
        return new ServiceListingResponseDto
        {
            Id = listing.Id,
            ProviderId = listing.ProviderId,
            ServiceCategoryId = listing.ServiceCategoryId,
            Title = listing.Title,
            Description = listing.Description,
            Scope = listing.Scope,
            Availability = listing.Availability,
            FixedPrice = listing.FixedPrice,
            DurationHours = listing.DurationHours > 0 ? listing.DurationHours : 1,
            EstimatedDuration = listing.EstimatedDuration,
            IsActive = listing.IsActive,
            CreatedAt = listing.CreatedAt,
            UpdatedAt = listing.UpdatedAt,
            ServiceCategoryName = listing.Category?.Name,
            ProviderFullName = listing.Provider?.FullName
        };
    }
}
