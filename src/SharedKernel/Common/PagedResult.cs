namespace SharedKernel.Common;

/// <summary>
/// Sayfalanmış liste sonucu — API'lerde büyük veri setleri için kullanılır.
/// </summary>
public sealed class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;

    public static PagedResult<T> Create(
        IReadOnlyList<T> items,
        int totalCount,
        int page,
        int pageSize)
    {
        return new PagedResult<T>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public static PagedResult<T> Empty(int page = 1, int pageSize = PagedQuery.DefaultPageSize) =>
        Create([], 0, page, pageSize);
}

/// <summary>
/// Sayfalama sorgu parametreleri
/// </summary>
public sealed record PagedQuery(int Page = 1, int PageSize = 50)
{
    public const int DefaultPageSize = 50;
    public const int MaximumPageSize = 100;

    public bool IsValid =>
        Page >= 1 &&
        PageSize is >= 1 and <= MaximumPageSize &&
        (long)(Page - 1) * PageSize <= int.MaxValue;

    public int Skip => (Page - 1) * PageSize;
}
