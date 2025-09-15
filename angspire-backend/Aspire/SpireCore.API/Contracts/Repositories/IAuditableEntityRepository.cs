using SpireCore.API.Contracts.Entities;
using SpireCore.Constants;
using SpireCore.Lists.Pagination;
using System.Linq.Expressions;

namespace SpireCore.API.Contracts.Repositories;

/// <summary>
/// Repository abstraction for <see cref="IAuditableEntity{TId}"/> types that
/// records the acting user/service (<paramref name="actor"/>) for every data
/// operation.  Implementations can therefore maintain <c>CreatedBy</c> /
/// <c>UpdatedBy</c> audit trails transparently while exposing the full CRUD
/// surface of <see cref="IEntityRepository{T,TId}"/>.
/// </summary>
/// <typeparam name="T">Concrete auditable entity.</typeparam>
/// <typeparam name="TId">Primary-key type of the entity.</typeparam>
public interface IAuditableEntityRepository<T, TId> : IEntityRepository<T, TId>
    where T : class, IAuditableEntity<TId>
{
    // --------------------------- Read -------------------------------

    /// <summary>
    /// Retrieves the entity whose identifier equals <paramref name="id"/>,
    /// provided it was created by <paramref name="actor"/> and matches the
    /// requested <paramref name="state"/>.
    /// </summary>
    Task<T?> GetByIdAsync(TId id, string actor, string? state = StateFlags.ACTIVE);

    /// <summary>
    /// Returns the first entity matching <paramref name="predicate"/> that
    /// also belongs to <paramref name="actor"/> and satisfies the requested
    /// <paramref name="state"/>.
    /// </summary>
    Task<T?> GetFilteredAsync(
        Expression<Func<T, bool>> predicate,
        string actor,
        string? state = StateFlags.ACTIVE);

    /// <summary>
    /// Returns a paginated result of entities that satisfy
    /// <paramref name="filter"/>, were created by <paramref name="actor"/>,
    /// and match the requested <paramref name="state"/>.
    /// </summary>
    Task<PaginatedResult<T>> GetPageAsync(
        Expression<Func<T, bool>> filter,
        string actor,
        int page,
        int pageSize,
        string? state = StateFlags.ACTIVE);

    /// <summary>
    /// Returns a paginated list of all entities created by
    /// <paramref name="actor"/> that match <paramref name="state"/>.
    /// </summary>
    Task<PaginatedResult<T>> GetPageAsync(
        string actor,
        int page,
        int pageSize,
        string? state = StateFlags.ACTIVE);

    // -------------------------- Create ------------------------------

    /// <summary>
    /// Persists <paramref name="entity"/> and stamps its audit fields
    /// (<c>CreatedBy</c>, <c>UpdatedBy</c>) with <paramref name="actor"/>.
    /// </summary>
    Task<T> AddAsync(T entity, string actor);

    /// <summary>
    /// Persists each entity in <paramref name="entities"/> and updates their
    /// audit fields with <paramref name="actor"/>.
    /// </summary>
    Task<IReadOnlyList<T>> AddRangeAsync(IEnumerable<T> entities, string actor);

    // --------------------------- Update ------------------------------

    /// <summary>
    /// Updates <paramref name="entity"/> and sets <c>UpdatedBy</c> to
    /// <paramref name="actor"/>.
    /// </summary>
    Task<T> UpdateAsync(T entity, string actor);

    /// <summary>
    /// Updates each entity in <paramref name="entities"/> and stamps
    /// <c>UpdatedBy</c> with <paramref name="actor"/>.
    /// </summary>
    Task<IReadOnlyList<T>> UpdateRangeAsync(IEnumerable<T> entities, string actor);

    // --------------------------- Delete ------------------------------

    /// <summary>
    /// Marks <paramref name="entity"/> as deleted and records
    /// <paramref name="actor"/> in <c>UpdatedBy</c>.
    /// </summary>
    Task<T> DeleteAsync(T entity, string actor);

    /// <summary>
    /// Marks each entity in <paramref name="entities"/> as deleted and
    /// records <paramref name="actor"/> in their audit fields.
    /// </summary>
    Task<IReadOnlyList<T>> DeleteRangeAsync(IEnumerable<T> entities, string actor);

    /// <summary>
    /// Soft-deletes the entity identified by <paramref name="id"/> that
    /// belongs to <paramref name="actor"/>.
    /// </summary>
    Task<T?> SoftDeleteAsync(TId id, string actor);
}

