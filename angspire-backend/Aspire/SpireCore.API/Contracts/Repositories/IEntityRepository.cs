using SpireCore.API.Contracts.Entities;
using SpireCore.Repositories;
using System.Linq.Expressions;

namespace SpireCore.API.Contracts.Repositories;

public interface IEntityRepository<T, TId> : IRepository<T>, ISoftDeleteRepository<T> where T : class, IEntity<TId>
{
    // --------------------------- Read Operations ---------------------------

    // Basic read methods
    Task<T?> GetByIdAsync(TId id);
    Task<T?> GetByIdAsync(TId id, string? state);

    Task<IEnumerable<T>> GetAllAsync(string? state);

    Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> predicate);
    Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> predicate, string? state);

    Task<T?> FindAsync(Expression<Func<T, bool>> predicate, string? state);

    // Existence checks
    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate, string? state);

    // Count operations
    Task<int> CountAsync();
    Task<int> CountAsync(string? state);
    Task<int> CountAsync(Expression<Func<T, bool>> predicate);
    Task<int> CountAsync(Expression<Func<T, bool>> predicate, string? state);

    // --------------------------- Delete Operations ---------------------------
    Task<T?> DeleteAsync(TId id);
    Task<T?> DeleteAsync(TId id, string? state);
    Task<T?> RestoreAsync(TId id);
    Task<T?> RestoreAsync(TId id, string? state);
}