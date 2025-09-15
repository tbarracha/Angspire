// -----------------------------------------------------------------------------
// Author: Tiago Barracha <ti.barracha@gmail.com>
// Created with AI assistance (ChatGPT)
//
// Description: Encapsulates paginated query results with metadata including total count
// and paging parameters for Entity Framework repository queries.
// -----------------------------------------------------------------------------

namespace SpireCore.Lists.Pagination;

/// <summary>
/// Represents a paginated result with metadata for total count and page boundaries.
/// </summary>
public class PaginatedResult<T>
{
    public IReadOnlyList<T> Items { get; }
    public int TotalCount { get; }
    public int Page { get; }
    public int PageSize { get; }

    public PaginatedResult(IEnumerable<T> items, int totalCount, int page, int pageSize)
    {
        Items = items.ToList();
        TotalCount = totalCount;
        Page = page;
        PageSize = pageSize;
    }

    public static PaginatedResult<T> Empty(int page, int pageSize)
        => new([], 0, page, pageSize);
}

