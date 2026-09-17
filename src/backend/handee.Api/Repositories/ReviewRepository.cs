using handee.API.Data;
using handee.API.Entities;
using handee.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace handee.API.Repositories;

public class ReviewRepository : IReviewRepository
{
    private readonly AppDbContext _context;

    public ReviewRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Review?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.Reviews
            .Include(r => r.Customer)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
    }

    public async Task<Review?> GetByCustomerAndProviderAsync(Guid customerId, Guid providerProfileId, CancellationToken ct = default)
    {
        return await _context.Reviews
            .FirstOrDefaultAsync(r => r.CustomerId == customerId && r.ProviderProfileId == providerProfileId, ct);
    }

    public async Task<(List<Review> Items, int TotalCount)> GetReviewsForProviderAsync(Guid providerProfileId, int skip, int take, CancellationToken ct = default)
    {
        var query = _context.Reviews
            .Include(r => r.Customer)
            .Where(r => r.ProviderProfileId == providerProfileId);

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<(decimal Aggregate, int Count)> GetProviderRatingAggregateAsync(Guid providerProfileId, CancellationToken ct = default)
    {
        var count = await _context.Reviews.CountAsync(r => r.ProviderProfileId == providerProfileId, ct);
        if (count == 0) return (0m, 0);

        var avg = await _context.Reviews
            .Where(r => r.ProviderProfileId == providerProfileId)
            .AverageAsync(r => (decimal?)r.Rating, ct) ?? 0m;

        // return precisely rounded up to 2 decimals
        return (Math.Round(avg, 2), count);
    }

    public async Task AddAsync(Review review, CancellationToken ct = default)
    {
        await _context.Reviews.AddAsync(review, ct);
    }

    public void Remove(Review review)
    {
        _context.Reviews.Remove(review);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
    }
}
