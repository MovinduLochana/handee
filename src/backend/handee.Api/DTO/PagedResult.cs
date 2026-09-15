namespace handee.API.DTO;

/// <summary>
/// Generic paged response wrapper used by list/search endpoints.
/// </summary>
/// <typeparam name="T">The item type in the page.</typeparam>
/// <param name="Items">Items in the current page.</param>
/// <param name="TotalCount">Total number of matching records (across all pages).</param>
/// <param name="Page">Current 1-indexed page number.</param>
/// <param name="PageSize">Number of items per page.</param>
public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize);
