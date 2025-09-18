using MongoDB.Driver;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.Contracts.Entities;
using SpireCore.API.Contracts.Repositories;
using SpireCore.API.DbProviders.Mongo.Entities;
using SpireCore.Constants;
using SpireCore.Lists.Pagination;
using System.Linq.Expressions;

namespace SpireCore.API.DbProviders.Mongo.Repositories;

public abstract class MongoAuditableEntityRepository<T>
    : MongoEntityRepository<T>,
      IAuditableEntityRepository<T, Guid>
    where T : MongoAuditableEntity, IAuditableEntity<Guid>
{
    // 1) ctor directly from a collection
    protected MongoAuditableEntityRepository(IMongoCollection<T> collection)
        : base(collection)
    {
    }

    // 2) module‐aware ctor
    protected MongoAuditableEntityRepository(
        IModuleDatabaseProvider provider,
        string moduleName,
        string collectionName)
        : base(provider, moduleName, collectionName)
    {
    }

    // --- Auditable CRUD ---

    public virtual async Task<T> AddAsync(T entity, string actor)
    {
        var now = DateTime.UtcNow;
        entity.CreatedAt = now;
        entity.UpdatedAt = now;
        entity.CreatedBy = actor;
        entity.UpdatedBy = actor;
        entity.StateFlag = StateFlags.ACTIVE;

        await _collection.InsertOneAsync(entity);
        return entity;
    }

    public virtual async Task<IReadOnlyList<T>> AddRangeAsync(
        IEnumerable<T> entities,
        string actor)
    {
        var now = DateTime.UtcNow;
        var list = new List<T>();

        foreach (var e in entities)
        {
            e.CreatedAt = now;
            e.UpdatedAt = now;
            e.CreatedBy = actor;
            e.UpdatedBy = actor;
            e.StateFlag = StateFlags.ACTIVE;
            list.Add(e);
        }

        await _collection.InsertManyAsync(list);
        return list;
    }

    public virtual async Task<T> UpdateAsync(T entity, string actor)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = actor;

        var result = await _collection.ReplaceOneAsync(
            x => x.Id == entity.Id,
            entity);

        if (result.IsAcknowledged && result.ModifiedCount == 1)
            return entity;

        throw new InvalidOperationException("Entity not found for update");
    }

    public virtual async Task<IReadOnlyList<T>> UpdateRangeAsync(
        IEnumerable<T> entities,
        string actor)
    {
        var updated = new List<T>();
        foreach (var e in entities)
            updated.Add(await UpdateAsync(e, actor));
        return updated;
    }

    public virtual async Task<T> DeleteAsync(T entity, string actor)
    {
        var result = await _collection.DeleteOneAsync(x => x.Id == entity.Id);
        if (result.DeletedCount == 1)
            return entity;

        throw new InvalidOperationException("Entity not found for deletion");
    }

    public virtual async Task<IReadOnlyList<T>> DeleteRangeAsync(
        IEnumerable<T> entities,
        string actor)
    {
        var deleted = new List<T>();
        foreach (var e in entities)
        {
            await DeleteAsync(e, actor);
            deleted.Add(e);
        }
        return deleted;
    }

    /// <summary>
    /// Delete by id + actor: first soft‐ or hard‐find, then delete.
    /// </summary>
    public virtual async Task<T?> DeleteAsync(Guid id, string actor)
    {
        var entity = await GetByIdAsync(id, actor);
        if (entity == null) return null;

        await DeleteAsync(entity, actor);
        return entity;
    }

    // --- Reads + Soft‐Delete ---

    public virtual async Task<T?> GetByIdAsync(
        Guid id,
        string actor,
        string? state = StateFlags.ACTIVE)
    {
        Expression<Func<T, bool>> predicate = x =>
            x.Id == id &&
            x.StateFlag == (state ?? StateFlags.ACTIVE);

        return await _collection.Find(predicate).FirstOrDefaultAsync();
    }

    public virtual async Task<T?> GetFilteredAsync(
        Expression<Func<T, bool>> predicate,
        string actor,
        string? state = StateFlags.ACTIVE)
    {
        var filters = new List<FilterDefinition<T>>
        {
            Builders<T>.Filter.Where(predicate)
        };

        if (!string.IsNullOrEmpty(state))
            filters.Add(
                Builders<T>.Filter.Eq(x => x.StateFlag, state));

        var combined = Builders<T>.Filter.And(filters);
        return await _collection.Find(combined)
                                .FirstOrDefaultAsync();
    }

    public virtual async Task<PaginatedResult<T>> GetPageAsync(
        Expression<Func<T, bool>> predicate,
        string actor,
        int page,
        int pageSize,
        string? state = StateFlags.ACTIVE)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var filters = Builders<T>.Filter.Where(predicate);
        if (!string.IsNullOrEmpty(state))
            filters = Builders<T>.Filter.And(
                filters,
                Builders<T>.Filter.Eq(x => x.StateFlag, state));

        var totalCount = await _collection.CountDocumentsAsync(filters);
        var items = await _collection.Find(filters)
                                     .Skip((page - 1) * pageSize)
                                     .Limit(pageSize)
                                     .ToListAsync();

        return new PaginatedResult<T>(items, (int)totalCount, page, pageSize);
    }

    public virtual async Task<PaginatedResult<T>> GetPageAsync(
        string actor,
        int page,
        int pageSize,
        string? state = StateFlags.ACTIVE)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var filter = Builders<T>.Filter.Eq(
            x => x.StateFlag,
            state ?? StateFlags.ACTIVE);

        var totalCount = await _collection.CountDocumentsAsync(filter);
        var items = await _collection.Find(filter)
                                     .Skip((page - 1) * pageSize)
                                     .Limit(pageSize)
                                     .ToListAsync();

        return new PaginatedResult<T>(items, (int)totalCount, page, pageSize);
    }

    public virtual async Task<T?> SoftDeleteAsync(
        Guid id,
        string actor)
    {
        var entity = await GetByIdAsync(id, actor);
        if (entity == null) return null;

        entity.StateFlag = StateFlags.DELETED;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = actor;

        await UpdateAsync(entity, actor);
        return entity;
    }
}
