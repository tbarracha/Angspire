using Microsoft.EntityFrameworkCore;
using SpireCore.API.Contracts.Repositories;
using SpireCore.API.DbProviders.EntityFramework.Entities;
using SpireCore.Constants;
using SpireCore.Lists.Pagination;
using SpireCore.Repositories;
using System.Linq.Expressions;

namespace SpireCore.API.DbProviders.EntityFramework.Repositories;

public abstract class EfEntityRepository<T, TId, TContext> : IEntityRepository<T, TId>, IEFRepository
    where T : class, IEfEntity<TId>
    where TContext : DbContext
{
    protected readonly TContext _context;
    protected readonly DbSet<T> _dbSet;

    protected EfEntityRepository(TContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }



    // --------------------------- IReadonlyRepository<T> ---------------------------

    public virtual async Task<IEnumerable<T>> GetAllAsync()
        => await _dbSet.Where(e => e.StateFlag == StateFlags.ACTIVE).ToListAsync();

    public virtual async Task<T?> FindAsync(Expression<Func<T, bool>> predicate)
        => await _dbSet.Where(e => e.StateFlag == StateFlags.ACTIVE).FirstOrDefaultAsync(predicate);

    public virtual async Task<IEnumerable<T>> FindAllAsync(Expression<Func<T, bool>> predicate)
        => await _dbSet.Where(e => e.StateFlag == StateFlags.ACTIVE).Where(predicate).ToListAsync();



    // --------------------------- IRepository<T> ---------------------------

    public virtual async Task<T> AddAsync(T entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.StateFlag = StateFlags.ACTIVE;

        await _dbSet.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<T> UpdateAsync(T entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<T> UpdateAsync(Expression<Func<T, bool>> predicate, T newEntity)
    {
        var existing = await _dbSet.FirstOrDefaultAsync(predicate);
        if (existing == null)
            throw new InvalidOperationException("Entity not found");

        newEntity.UpdatedAt = DateTime.UtcNow;
        _context.Entry(existing).CurrentValues.SetValues(newEntity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public virtual async Task<T> DeleteAsync(Expression<Func<T, bool>> predicate)
    {
        var entity = await _dbSet.FirstOrDefaultAsync(predicate);
        if (entity == null)
            throw new InvalidOperationException("Entity not found");

        return await SoftDeleteAsync(entity);
    }

    public virtual async Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entities)
    {
        var entityList = entities.ToList();
        var now = DateTime.UtcNow;

        foreach (var entity in entityList)
        {
            entity.CreatedAt = now;
            entity.UpdatedAt = now;
            entity.StateFlag = StateFlags.ACTIVE;
        }

        await _dbSet.AddRangeAsync(entityList);
        await _context.SaveChangesAsync();
        return entityList;
    }

    public virtual async Task<IEnumerable<T>> UpdateRangeAsync(IEnumerable<T> entities)
    {
        var entityList = entities.ToList();
        var now = DateTime.UtcNow;

        foreach (var entity in entityList)
        {
            entity.UpdatedAt = now;
        }

        _dbSet.UpdateRange(entityList);
        await _context.SaveChangesAsync();
        return entityList;
    }

    public virtual async Task<int> DeleteRangeAsync(IEnumerable<T> entities)
    {
        var entityList = entities.ToList();
        var now = DateTime.UtcNow;

        foreach (var entity in entityList)
        {
            entity.StateFlag = StateFlags.DELETED;
            entity.UpdatedAt = now;
        }

        _dbSet.UpdateRange(entityList);
        return await _context.SaveChangesAsync();
    }

    public virtual async Task<int> DeleteRangeAsync(Expression<Func<T, bool>> predicate)
    {
        var entities = await _dbSet.Where(predicate).ToListAsync();
        var now = DateTime.UtcNow;

        foreach (var entity in entities)
        {
            entity.StateFlag = StateFlags.DELETED;
            entity.UpdatedAt = now;
        }

        _dbSet.UpdateRange(entities);
        return await _context.SaveChangesAsync();
    }



    // --------------------------- ISoftDeleteRepository<T> ---------------------------

    public virtual async Task<T> SoftDeleteAsync(T entity)
    {
        if (entity == null)
            throw new ArgumentNullException(nameof(entity));

        entity.StateFlag = StateFlags.DELETED;
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<T> SoftDeleteAsync(Expression<Func<T, bool>> predicate)
    {
        var entity = await _dbSet.FirstOrDefaultAsync(predicate);
        if (entity == null)
            throw new InvalidOperationException("Entity not found");

        entity.StateFlag = StateFlags.DELETED;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<IEnumerable<T>> SoftDeleteRangeAsync(IEnumerable<T> entities)
    {
        var entityList = entities.ToList();
        var now = DateTime.UtcNow;

        foreach (var entity in entityList)
        {
            entity.StateFlag = StateFlags.DELETED;
            entity.UpdatedAt = now;
        }

        _dbSet.UpdateRange(entityList);
        await _context.SaveChangesAsync();
        return entityList;
    }

    public virtual async Task<int> SoftDeleteRangeAsync(Expression<Func<T, bool>> predicate)
    {
        var entities = await _dbSet.Where(predicate).ToListAsync();
        var now = DateTime.UtcNow;

        foreach (var entity in entities)
        {
            entity.StateFlag = StateFlags.DELETED;
            entity.UpdatedAt = now;
        }

        _dbSet.UpdateRange(entities);
        return await _context.SaveChangesAsync();
    }

    public virtual async Task<T> RestoreAsync(Expression<Func<T, bool>> predicate)
    {
        var entity = await _dbSet.FirstOrDefaultAsync(predicate);
        if (entity == null)
            throw new InvalidOperationException("Entity not found");

        entity.StateFlag = StateFlags.ACTIVE;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<IEnumerable<T>> RestoreRangeAsync(IEnumerable<T> entities)
    {
        var entityList = entities.ToList();
        var now = DateTime.UtcNow;

        foreach (var entity in entityList)
        {
            entity.StateFlag = StateFlags.ACTIVE;
            entity.UpdatedAt = now;
        }

        _dbSet.UpdateRange(entityList);
        await _context.SaveChangesAsync();
        return entityList;
    }

    public virtual async Task<int> RestoreRangeAsync(Expression<Func<T, bool>> predicate)
    {
        var entities = await _dbSet.Where(predicate).ToListAsync();
        var now = DateTime.UtcNow;

        foreach (var entity in entities)
        {
            entity.StateFlag = StateFlags.ACTIVE;
            entity.UpdatedAt = now;
        }

        _dbSet.UpdateRange(entities);
        return await _context.SaveChangesAsync();
    }

    public virtual async Task<IEnumerable<T>> GetAllIncludingDeletedAsync()
        => await _dbSet.ToListAsync();

    public virtual async Task<IEnumerable<T>> GetDeletedAsync()
        => await _dbSet.Where(e => e.StateFlag == StateFlags.DELETED).ToListAsync();

    public virtual async Task<T?> FindDeletedAsync(Expression<Func<T, bool>> predicate)
        => await _dbSet.Where(e => e.StateFlag == StateFlags.DELETED).FirstOrDefaultAsync(predicate);

    public virtual async Task<IEnumerable<T>> FindAllDeletedAsync(Expression<Func<T, bool>> predicate)
        => await _dbSet.Where(e => e.StateFlag == StateFlags.DELETED).Where(predicate).ToListAsync();



    // --------------------------- IEntityRepository<T, TId> ---------------------------

    public virtual async Task<T?> GetByIdAsync(TId id)
        => await _dbSet.FirstOrDefaultAsync(e => e.Id.Equals(id) && e.StateFlag == StateFlags.ACTIVE);

    public virtual async Task<T?> GetByIdAsync(TId id, string? state)
    {
        var query = _dbSet.AsQueryable();
        if (state != null)
            query = query.Where(e => e.StateFlag == state);
        return await query.FirstOrDefaultAsync(e => e.Id.Equals(id));
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync(string? state)
    {
        var query = _dbSet.AsQueryable();
        if (state != null)
            query = query.Where(e => e.StateFlag == state);
        return await query.ToListAsync();
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> predicate)
        => await _dbSet.Where(e => e.StateFlag == StateFlags.ACTIVE).Where(predicate).ToListAsync();

    public virtual async Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> predicate, string? state)
    {
        var query = _dbSet.AsQueryable();
        if (state != null)
            query = query.Where(e => e.StateFlag == state);
        return await query.Where(predicate).ToListAsync();
    }

    public virtual async Task<T?> FindAsync(Expression<Func<T, bool>> predicate, string? state)
    {
        var query = _dbSet.AsQueryable();
        if (state != null)
            query = query.Where(e => e.StateFlag == state);
        return await query.FirstOrDefaultAsync(predicate);
    }

    public virtual async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate)
        => await _dbSet.Where(e => e.StateFlag == StateFlags.ACTIVE).AnyAsync(predicate);

    public virtual async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate, string? state)
    {
        var query = _dbSet.AsQueryable();
        if (state != null)
            query = query.Where(e => e.StateFlag == state);
        return await query.AnyAsync(predicate);
    }

    public virtual async Task<int> CountAsync()
        => await _dbSet.CountAsync(e => e.StateFlag == StateFlags.ACTIVE);

    public virtual async Task<int> CountAsync(string? state)
    {
        var query = _dbSet.AsQueryable();
        if (state != null)
            query = query.Where(e => e.StateFlag == state);
        return await query.CountAsync();
    }

    public virtual async Task<int> CountAsync(Expression<Func<T, bool>> predicate)
        => await _dbSet.Where(e => e.StateFlag == StateFlags.ACTIVE).CountAsync(predicate);

    public virtual async Task<int> CountAsync(Expression<Func<T, bool>> predicate, string? state)
    {
        var query = _dbSet.AsQueryable();
        if (state != null)
            query = query.Where(e => e.StateFlag == state);
        return await query.CountAsync(predicate);
    }

    public virtual async Task<T> DeleteAsync(T entity)
    {
        entity.StateFlag = StateFlags.DELETED;
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<T?> DeleteAsync(TId id)
    {
        var entity = await GetByIdAsync(id);
        if (entity == null) return null;

        entity.StateFlag = StateFlags.DELETED;
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<T?> DeleteAsync(TId id, string? state)
    {
        var entity = await GetByIdAsync(id, state);
        if (entity == null) return null;

        entity.StateFlag = StateFlags.DELETED;
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<T?> RestoreAsync(TId id)
    {
        var entity = await FindDeletedAsync(e => e.Id.Equals(id));
        if (entity == null) return null;

        entity.StateFlag = StateFlags.ACTIVE;
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<T?> RestoreAsync(TId id, string? state)
    {
        var entity = await FindDeletedAsync(e => e.Id.Equals(id) && (state == null || e.StateFlag == state));
        if (entity == null) return null;

        entity.StateFlag = StateFlags.ACTIVE;
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }



    // --------------------------- IPagination<T> ---------------------------

    public virtual async Task<PaginatedResult<T>> GetPageAsync(int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var query = _dbSet.Where(e => e.StateFlag == StateFlags.ACTIVE);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<T>(items, totalCount, page, pageSize);
    }

    public virtual async Task<PaginatedResult<T>> GetPageAsync(
        Expression<Func<T, bool>> filter,
        int page,
        int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var query = _dbSet
            .Where(e => e.StateFlag == StateFlags.ACTIVE)
            .Where(filter);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResult<T>(items, totalCount, page, pageSize);
    }

    public virtual async Task<PaginatedResult<T>> GetPageAsync(
        Expression<Func<T, bool>> filter,
        int page,
        int pageSize,
        Func<IQueryable<T>, IOrderedQueryable<T>> orderBy)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var query = _dbSet.Where(e => e.StateFlag == StateFlags.ACTIVE)
                          .Where(filter);

        var ordered = orderBy != null ? orderBy(query) : query.OrderBy(_ => 0);
        var total = await ordered.CountAsync();
        var items = await ordered.Skip((page - 1) * pageSize)
                                   .Take(pageSize)
                                   .ToListAsync();

        return new PaginatedResult<T>(items, total, page, pageSize);
    }
}