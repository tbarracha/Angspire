using Microsoft.EntityFrameworkCore;
using SpireCore.API.Contracts.Entities;
using SpireCore.API.Contracts.Repositories;
using SpireCore.API.DbProviders.EntityFramework.Entities;
using SpireCore.Constants;
using SpireCore.Lists.Pagination;
using System.Linq.Expressions;

namespace SpireCore.API.DbProviders.EntityFramework.Repositories;

/// <summary>
/// Entity-Framework-Core implementation of
/// <see cref="IAuditableEntityRepository{T,TId}"/>.  Inherits the generic
/// data-access logic from <see cref="EfEntityRepository{T,TId,TContext}"/>
/// and augments every CRUD operation with audit stamping
/// (<c>CreatedBy</c>/<c>UpdatedBy</c>) driven by an explicit
/// <paramref name="actor"/> parameter.
/// </summary>
/// <typeparam name="T">Concrete auditable entity.</typeparam>
/// <typeparam name="TId">Entity primary-key type.</typeparam>
/// <typeparam name="TContext">Application <see cref="DbContext"/>.</typeparam>
public abstract class EfAuditableEntityRepository<T, TId, TContext>
    : EfEntityRepository<T, TId, TContext>, IAuditableEntityRepository<T, TId>
    where T : class, IEfEntity<TId>, IAuditableEntity<TId>
    where TContext : DbContext
{
    /// <summary>
    /// Initializes a new repository bound to the supplied EF&nbsp;Core
    /// <paramref name="context"/>.
    /// </summary>
    protected EfAuditableEntityRepository(TContext context) : base(context) { }

    // --------------------------- Read -------------------------------

    /// <inheritdoc/>
    public virtual async Task<T?> GetByIdAsync(TId id, string actor, string? state = StateFlags.ACTIVE)
    {
        var query = _dbSet.AsQueryable();

        if (state != null)
            query = query.Where(e => e.StateFlag == state);

        query = query.Where(e => e.CreatedBy == actor);

        return await query.FirstOrDefaultAsync(e => e.Id.Equals(id));
    }

    /// <inheritdoc/>
    public virtual async Task<T?> GetFilteredAsync(
        Expression<Func<T, bool>> predicate,
        string actor,
        string? state = StateFlags.ACTIVE)
    {
        var query = _dbSet.AsQueryable();

        if (state != null)
            query = query.Where(e => e.StateFlag == state);

        query = query.Where(e => e.CreatedBy == actor);

        return await query.FirstOrDefaultAsync(predicate);
    }

    /// <inheritdoc/>
    public virtual async Task<PaginatedResult<T>> GetPageAsync(
        Expression<Func<T, bool>> filter,
        string actor,
        int page,
        int pageSize,
        string? state = StateFlags.ACTIVE)
    {
        var query = _dbSet.AsQueryable();

        if (state != null)
            query = query.Where(e => e.StateFlag == state);

        query = query.Where(e => e.CreatedBy == actor && filter.Compile().Invoke(e));

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<T>(items, totalCount, page, pageSize);
    }

    /// <inheritdoc/>
    public virtual async Task<PaginatedResult<T>> GetPageAsync(
        string actor,
        int page,
        int pageSize,
        string? state = StateFlags.ACTIVE)
    {
        var query = _dbSet.AsQueryable();

        if (state != null)
            query = query.Where(e => e.StateFlag == state);

        query = query.Where(e => e.CreatedBy == actor);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<T>(items, totalCount, page, pageSize);
    }

    // --------------------------- Create ------------------------------

    /// <inheritdoc/>
    public virtual async Task<T> AddAsync(T entity, string actor)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.CreatedBy = actor;
        entity.UpdatedBy = actor;

        await _dbSet.AddAsync(entity);
        await _context.SaveChangesAsync();

        return entity;
    }

    /// <inheritdoc/>
    public virtual async Task<IReadOnlyList<T>> AddRangeAsync(IEnumerable<T> entities, string actor)
    {
        var entityList = entities.ToList();
        var utcNow = DateTime.UtcNow;

        foreach (var entity in entityList)
        {
            entity.CreatedAt = utcNow;
            entity.UpdatedAt = utcNow;
            entity.CreatedBy = actor;
            entity.UpdatedBy = actor;
        }

        await _dbSet.AddRangeAsync(entityList);
        await _context.SaveChangesAsync();

        return entityList;
    }

    // --------------------------- Update ------------------------------

    /// <inheritdoc/>
    public virtual async Task<T> UpdateAsync(T entity, string actor)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = actor;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();

        return entity;
    }

    /// <inheritdoc/>
    public virtual async Task<IReadOnlyList<T>> UpdateRangeAsync(IEnumerable<T> entities, string actor)
    {
        var entityList = entities.ToList();
        var utcNow = DateTime.UtcNow;

        foreach (var entity in entityList)
        {
            entity.UpdatedAt = utcNow;
            entity.UpdatedBy = actor;
        }

        _dbSet.UpdateRange(entityList);
        await _context.SaveChangesAsync();

        return entityList;
    }

    // --------------------------- Delete ------------------------------

    /// <inheritdoc/>
    public virtual async Task<T> DeleteAsync(T entity, string actor)
    {
        entity.StateFlag = StateFlags.DELETED;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = actor;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();

        return entity;
    }

    /// <inheritdoc/>
    public virtual async Task<IReadOnlyList<T>> DeleteRangeAsync(IEnumerable<T> entities, string actor)
    {
        var entityList = entities.ToList();
        var utcNow = DateTime.UtcNow;

        foreach (var entity in entityList)
        {
            entity.StateFlag = StateFlags.DELETED;
            entity.UpdatedAt = utcNow;
            entity.UpdatedBy = actor;
        }

        _dbSet.UpdateRange(entityList);
        await _context.SaveChangesAsync();

        return entityList;
    }

    /// <inheritdoc/>
    public virtual async Task<T?> SoftDeleteAsync(TId id, string actor)
    {
        var entity = await GetByIdAsync(id, actor);
        if (entity is null) return null;

        entity.StateFlag = StateFlags.DELETED;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = actor;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();

        return entity;
    }
}

