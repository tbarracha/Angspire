// -----------------------------------------------------------------------------
// Author: Tiago Barracha <ti.barracha@gmail.com>
// Created with AI assistance (ChatGPT)
// -----------------------------------------------------------------------------

using System.Linq.Expressions;

namespace SpireCore.Lists.Pagination;

public interface IPagination<T> where T : class
{
    Task<PaginatedResult<T>> GetPageAsync(int page, int pageSize);

    Task<PaginatedResult<T>> GetPageAsync(
        Expression<Func<T, bool>> filter,
        int page,
        int pageSize);

    Task<PaginatedResult<T>> GetPageAsync(
        Expression<Func<T, bool>> filter,
        int page,
        int pageSize,
        Func<IQueryable<T>, IOrderedQueryable<T>> orderBy);
}

