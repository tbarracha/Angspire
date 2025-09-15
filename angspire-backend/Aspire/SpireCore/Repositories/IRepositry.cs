using SpireCore.Lists.Pagination;
using System.Linq.Expressions;

namespace SpireCore.Repositories;

public interface IReadonlyRepository<T> where T : class
{
    Task<IEnumerable<T>> GetAllAsync();
    Task<T?> FindAsync(Expression<Func<T, bool>> predicate);
    Task<IEnumerable<T>> FindAllAsync(Expression<Func<T, bool>> predicate);
}

public interface IRepository<T> : IReadonlyRepository<T>, IPagination<T> where T : class
{
    Task<T> AddAsync(T entity);
    Task<T> UpdateAsync(T entity);
    Task<T> DeleteAsync(T entity);
    Task<T> UpdateAsync(Expression<Func<T, bool>> predicate, T newEntity);
    Task<T> DeleteAsync(Expression<Func<T, bool>> predicate);

    Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entities);
    Task<IEnumerable<T>> UpdateRangeAsync(IEnumerable<T> entities);

    Task<int> DeleteRangeAsync(IEnumerable<T> entities);
    Task<int> DeleteRangeAsync(Expression<Func<T, bool>> predicate);
}

public interface ISoftDeleteRepository<T> : IRepository<T> where T : class
{
    // Soft delete operations
    Task<T> SoftDeleteAsync(T entity);
    Task<T> SoftDeleteAsync(Expression<Func<T, bool>> predicate);
    Task<IEnumerable<T>> SoftDeleteRangeAsync(IEnumerable<T> entities);
    Task<int> SoftDeleteRangeAsync(Expression<Func<T, bool>> predicate);

    // Restoration operations
    Task<T> RestoreAsync(Expression<Func<T, bool>> predicate);
    Task<IEnumerable<T>> RestoreRangeAsync(IEnumerable<T> entities);
    Task<int> RestoreRangeAsync(Expression<Func<T, bool>> predicate);

    // Specialized queries
    Task<IEnumerable<T>> GetAllIncludingDeletedAsync();
    Task<IEnumerable<T>> GetDeletedAsync();
    Task<T?> FindDeletedAsync(Expression<Func<T, bool>> predicate);
    Task<IEnumerable<T>> FindAllDeletedAsync(Expression<Func<T, bool>> predicate);
}