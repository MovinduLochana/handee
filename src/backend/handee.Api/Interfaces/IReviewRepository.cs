namespace handee.API.Interfaces;
using handee.API.Entities;

public interface IReviewRepository
{
    Task<Review?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Review?> GetByCustomerAndProviderAsync(Guid customerId, Guid providerProfileId, CancellationToken ct = default);
    Task<(List<Review> Items, int TotalCount)> GetReviewsForProviderAsync(Guid providerProfileId, int skip, int take, CancellationToken ct = default);
    Task<(decimal Aggregate, int Count)> GetProviderRatingAggregateAsync(Guid providerProfileId, CancellationToken ct = default);
    Task AddAsync(Review review, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    void Remove(Review review);
}
