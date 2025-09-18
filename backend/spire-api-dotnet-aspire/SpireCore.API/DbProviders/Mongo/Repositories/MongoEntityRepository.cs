// File: SpireCore.API.DbProviders.Mongo/Repositories/MongoEntityRepository.cs
using MongoDB.Bson;
using MongoDB.Driver;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.Contracts.Entities;
using SpireCore.API.Contracts.Repositories;
using SpireCore.API.DbProviders.Mongo.Entities;
using SpireCore.Constants;
using SpireCore.Lists.Pagination;
using SpireCore.Repositories;
using System.Collections.Concurrent;
using System.Linq.Expressions;

namespace SpireCore.API.DbProviders.Mongo.Repositories
{
    /// <summary>
    /// Base class for MongoDB repositories with:
    ///  • Standard CRUD/query ops
    ///  • One-time, thread-safe index enforcement (attribute-driven + optional overrides)
    /// </summary>
    public abstract class MongoEntityRepository<T> : IEntityRepository<T, Guid>, IMongoRepository
        where T : MongoEntity, IEntity<Guid>
    {
        protected readonly IMongoCollection<T> _collection;

        // one-time per (dbName.collectionName) guard
        private static readonly ConcurrentDictionary<string, bool> _indexesEnsured = new(StringComparer.Ordinal);
        private static readonly object _ensureLock = new();

        // 1) ctor directly from a collection
        protected MongoEntityRepository(IMongoCollection<T> collection)
        {
            _collection = collection;
            EnsureIndexesOnce();
        }

        // 2) module-aware ctor
        protected MongoEntityRepository(
            IModuleDatabaseProvider provider,
            string moduleName,
            string collectionName)
            : this(
                provider
                    .GetMongoDatabase(moduleName)
                    .GetCollection<T>(collectionName))
        {
        }

        /// <summary>
        /// Enable attribute-driven index discovery for T. Override to disable if needed.
        /// </summary>
        protected virtual bool UseAttributeIndexes => true;

        /// <summary>
        /// Provide additional typed/hand-tuned indexes for this repository.
        /// Override in derived repositories to return CreateIndexModel&lt;T&gt; instances.
        /// </summary>
        protected virtual IEnumerable<CreateIndexModel<T>> BuildIndexes() => Array.Empty<CreateIndexModel<T>>();

        private void EnsureIndexesOnce()
        {
            var ns = _collection.Database.DatabaseNamespace.DatabaseName + "." + _collection.CollectionNamespace.CollectionName;

            if (_indexesEnsured.ContainsKey(ns)) return;

            lock (_ensureLock)
            {
                if (_indexesEnsured.ContainsKey(ns)) return;

                // 1) Attribute-driven indexes (if any)
                if (UseAttributeIndexes)
                {
                    var attrModelsBson = MongoIndexInitializer.BuildAttributeIndexModels(typeof(T));
                    if (attrModelsBson.Count > 0)
                    {
                        // Create on BsonDocument view to support string field paths easily
                        var docCol = _collection.Database.GetCollection<BsonDocument>(_collection.CollectionNamespace.CollectionName);
                        docCol.Indexes.CreateMany(attrModelsBson);
                    }
                }

                // 2) Per-repository custom indexes
                var custom = BuildIndexes();
                if (custom is { })
                {
                    var models = custom.ToArray();
                    if (models.Length > 0)
                        _collection.Indexes.CreateMany(models);
                }

                _indexesEnsured[ns] = true;
            }
        }

        // --- Core Insert/Update/Delete ---

        public virtual async Task<T> AddAsync(T entity)
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.StateFlag = StateFlags.ACTIVE;
            await _collection.InsertOneAsync(entity);
            return entity;
        }

        public virtual async Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entities)
        {
            var now = DateTime.UtcNow;
            foreach (var e in entities)
            {
                e.CreatedAt = now;
                e.UpdatedAt = now;
                e.StateFlag = StateFlags.ACTIVE;
            }
            await _collection.InsertManyAsync(entities);
            return entities;
        }

        public virtual async Task<T> UpdateAsync(T entity)
        {
            entity.UpdatedAt = DateTime.UtcNow;
            var result = await _collection.ReplaceOneAsync(
                x => x.Id == entity.Id,
                entity);

            if (result.IsAcknowledged && result.ModifiedCount == 1)
                return entity;

            throw new InvalidOperationException("Entity not found for update");
        }

        public virtual async Task<T> UpdateAsync(Expression<Func<T, bool>> predicate, T newEntity)
        {
            var old = await _collection.Find(predicate).FirstOrDefaultAsync();
            if (old == null) throw new InvalidOperationException("Entity not found");

            newEntity.Id = old.Id;
            newEntity.UpdatedAt = DateTime.UtcNow;
            var result = await _collection.ReplaceOneAsync(x => x.Id == old.Id, newEntity);

            if (result.IsAcknowledged && result.ModifiedCount == 1)
                return newEntity;

            throw new InvalidOperationException("Entity not updated");
        }

        public virtual async Task<IEnumerable<T>> UpdateRangeAsync(IEnumerable<T> entities)
        {
            var updated = new List<T>();
            foreach (var e in entities)
                updated.Add(await UpdateAsync(e));
            return updated;
        }

        public virtual async Task<T> DeleteAsync(T entity)
        {
            var result = await _collection.DeleteOneAsync(x => x.Id == entity.Id);
            if (result.DeletedCount == 1) return entity;
            throw new InvalidOperationException("Entity not found for deletion");
        }

        public virtual async Task<T?> DeleteAsync(Guid id)
        {
            var e = await GetByIdAsync(id);
            if (e == null) return null;
            await DeleteAsync(e);
            return e;
        }

        public virtual async Task<T?> DeleteAsync(Guid id, string? state)
        {
            var e = await GetByIdAsync(id, state);
            if (e == null) return null;
            await DeleteAsync(e);
            return e;
        }

        public virtual async Task<T> DeleteAsync(Expression<Func<T, bool>> predicate)
        {
            var e = await _collection.Find(predicate).FirstOrDefaultAsync();
            if (e == null) throw new InvalidOperationException("Entity not found");
            await DeleteAsync(e);
            return e;
        }

        public virtual async Task<int> DeleteRangeAsync(IEnumerable<T> entities)
        {
            var count = 0;
            foreach (var e in entities)
            {
                await DeleteAsync(e);
                count++;
            }
            return count;
        }

        public virtual async Task<int> DeleteRangeAsync(Expression<Func<T, bool>> predicate)
        {
            var result = await _collection.DeleteManyAsync(predicate);
            return (int)result.DeletedCount;
        }

        // --- Existence / Count ---

        public virtual async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate)
            => await _collection.Find(predicate).AnyAsync();

        public virtual async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate, string? state)
        {
            var filter = Builders<T>.Filter.Where(predicate);
            if (!string.IsNullOrEmpty(state))
                filter = Builders<T>.Filter.And(filter,
                    Builders<T>.Filter.Eq(x => x.StateFlag, state));
            return await _collection.Find(filter).AnyAsync();
        }

        public virtual async Task<int> CountAsync()
            => (int)await _collection.CountDocumentsAsync(x => x.StateFlag == StateFlags.ACTIVE);

        public virtual async Task<int> CountAsync(string? state)
            => string.IsNullOrEmpty(state)
               ? (int)await _collection.CountDocumentsAsync(_ => true)
               : (int)await _collection.CountDocumentsAsync(x => x.StateFlag == state);

        public virtual async Task<int> CountAsync(Expression<Func<T, bool>> predicate)
            => (int)await _collection.CountDocumentsAsync(
                 Builders<T>.Filter.And(
                   Builders<T>.Filter.Where(predicate),
                   Builders<T>.Filter.Eq(x => x.StateFlag, StateFlags.ACTIVE)
                 ));

        public virtual async Task<int> CountAsync(Expression<Func<T, bool>> predicate, string? state)
        {
            var filters = new List<FilterDefinition<T>>{
                    Builders<T>.Filter.Where(predicate)
                };
            if (!string.IsNullOrEmpty(state))
                filters.Add(Builders<T>.Filter.Eq(x => x.StateFlag, state));
            return (int)await _collection.CountDocumentsAsync(
                Builders<T>.Filter.And(filters));
        }

        // --- Find / Get ---

        public virtual async Task<T?> GetByIdAsync(Guid id)
            => await _collection.Find(x =>
                   x.Id == id &&
                   x.StateFlag == StateFlags.ACTIVE)
                 .FirstOrDefaultAsync();

        public virtual async Task<T?> GetByIdAsync(Guid id, string? state)
        {
            Expression<Func<T, bool>> pred = x =>
                x.Id == id &&
                x.StateFlag == (state ?? StateFlags.ACTIVE);

            return await _collection.Find(pred).FirstOrDefaultAsync();
        }

        public virtual async Task<IEnumerable<T>> GetAllAsync()
            => await _collection.Find(x => x.StateFlag == StateFlags.ACTIVE)
                                .ToListAsync();

        public virtual async Task<IEnumerable<T>> GetAllAsync(string? state)
            => string.IsNullOrEmpty(state)
               ? await _collection.Find(_ => true).ToListAsync()
               : await _collection.Find(x => x.StateFlag == state)
                                  .ToListAsync();

        public virtual async Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> predicate)
            => await _collection.Find(
                   Builders<T>.Filter.And(
                      Builders<T>.Filter.Where(predicate),
                      Builders<T>.Filter.Eq(x => x.StateFlag, StateFlags.ACTIVE)
                   ))
                   .ToListAsync();

        public virtual async Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> predicate, string? state)
        {
            var filters = new List<FilterDefinition<T>>{
                    Builders<T>.Filter.Where(predicate)
                };
            if (!string.IsNullOrEmpty(state))
                filters.Add(Builders<T>.Filter.Eq(x => x.StateFlag, state));
            return await _collection.Find(
                   Builders<T>.Filter.And(filters))
                   .ToListAsync();
        }

        public virtual async Task<T?> FindAsync(Expression<Func<T, bool>> predicate)
            => await _collection.Find(
                   Builders<T>.Filter.And(
                      Builders<T>.Filter.Where(predicate),
                      Builders<T>.Filter.Eq(x => x.StateFlag, StateFlags.ACTIVE)
                   ))
                   .FirstOrDefaultAsync();

        public virtual async Task<T?> FindAsync(Expression<Func<T, bool>> predicate, string? state)
        {
            var filters = new List<FilterDefinition<T>>{
                    Builders<T>.Filter.Where(predicate)
                };
            if (!string.IsNullOrEmpty(state))
                filters.Add(Builders<T>.Filter.Eq(x => x.StateFlag, state));
            return await _collection.Find(
                   Builders<T>.Filter.And(filters))
                   .FirstOrDefaultAsync();
        }

        public virtual async Task<IEnumerable<T>> FindAllAsync(Expression<Func<T, bool>> predicate)
            => await _collection.Find(
                   Builders<T>.Filter.And(
                      Builders<T>.Filter.Where(predicate),
                      Builders<T>.Filter.Eq(x => x.StateFlag, StateFlags.ACTIVE)
                   ))
                   .ToListAsync();

        // --- Soft Delete & Restore ---

        public virtual async Task<T> SoftDeleteAsync(T entity)
        {
            entity.StateFlag = StateFlags.DELETED;
            entity.UpdatedAt = DateTime.UtcNow;
            await UpdateAsync(entity);
            return entity;
        }

        public virtual async Task<T> SoftDeleteAsync(Expression<Func<T, bool>> predicate)
        {
            var e = await FindAsync(predicate);
            if (e == null) throw new InvalidOperationException("Entity not found");
            return await SoftDeleteAsync(e);
        }

        public virtual async Task<IEnumerable<T>> SoftDeleteRangeAsync(IEnumerable<T> entities)
        {
            foreach (var e in entities)
                await SoftDeleteAsync(e);
            return entities;
        }

        public virtual async Task<int> SoftDeleteRangeAsync(Expression<Func<T, bool>> predicate)
        {
            var list = await FindAllAsync(predicate);
            var count = 0;
            foreach (var e in list)
            {
                await RestoreAsync(x => x.Id == e.Id); // ensure fetch; then set DELETED below
                e.StateFlag = StateFlags.DELETED;
                e.UpdatedAt = DateTime.UtcNow;
                await UpdateAsync(e);
                count++;
            }
            return count;
        }

        public virtual async Task<T?> RestoreAsync(Guid id)
            => await RestoreAsync(x => x.Id == id);

        public virtual async Task<T?> RestoreAsync(Guid id, string? state)
        {
            var e = await GetByIdAsync(id, state);
            if (e == null) return null;
            e.StateFlag = StateFlags.ACTIVE;
            e.UpdatedAt = DateTime.UtcNow;
            await UpdateAsync(e);
            return e;
        }

        public virtual async Task<T> RestoreAsync(Expression<Func<T, bool>> predicate)
        {
            var e = await FindDeletedAsync(predicate);
            if (e == null) throw new InvalidOperationException("Entity not found");
            e.StateFlag = StateFlags.ACTIVE;
            e.UpdatedAt = DateTime.UtcNow;
            await UpdateAsync(e);
            return e;
        }

        public virtual async Task<IEnumerable<T>> RestoreRangeAsync(IEnumerable<T> entities)
        {
            foreach (var e in entities)
            {
                e.StateFlag = StateFlags.ACTIVE;
                e.UpdatedAt = DateTime.UtcNow;
                await UpdateAsync(e);
            }
            return entities;
        }

        public virtual async Task<int> RestoreRangeAsync(Expression<Func<T, bool>> predicate)
        {
            var list = await FindAllDeletedAsync(predicate);
            var count = 0;
            foreach (var e in list)
            {
                await RestoreAsync(x => x.Id == e.Id);
                count++;
            }
            return count;
        }

        public virtual async Task<T?> FindDeletedAsync(Expression<Func<T, bool>> predicate)
            => await _collection.Find(
                   Builders<T>.Filter.And(
                      Builders<T>.Filter.Where(predicate),
                      Builders<T>.Filter.Eq(x => x.StateFlag, StateFlags.DELETED)
                   ))
                   .FirstOrDefaultAsync();

        public virtual async Task<IEnumerable<T>> FindAllDeletedAsync(Expression<Func<T, bool>> predicate)
            => await _collection.Find(
                   Builders<T>.Filter.And(
                      Builders<T>.Filter.Where(predicate),
                      Builders<T>.Filter.Eq(x => x.StateFlag, StateFlags.DELETED)
                   ))
                   .ToListAsync();

        public virtual async Task<PaginatedResult<T>> GetPageAsync(int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var total = await _collection.CountDocumentsAsync(x => x.StateFlag == StateFlags.ACTIVE);
            var items = await _collection.Find(x => x.StateFlag == StateFlags.ACTIVE)
                                         .Skip((page - 1) * pageSize)
                                         .Limit(pageSize)
                                         .ToListAsync();

            return new PaginatedResult<T>(items, (int)total, page, pageSize);
        }

        public virtual async Task<PaginatedResult<T>> GetPageAsync(
            Expression<Func<T, bool>> predicate,
            int page,
            int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var filters = Builders<T>.Filter.And(
                Builders<T>.Filter.Where(predicate),
                Builders<T>.Filter.Eq(x => x.StateFlag, StateFlags.ACTIVE)
            );

            var total = await _collection.CountDocumentsAsync(filters);
            var items = await _collection.Find(filters)
                                         .Skip((page - 1) * pageSize)
                                         .Limit(pageSize)
                                         .ToListAsync();

            return new PaginatedResult<T>(items, (int)total, page, pageSize);
        }

        public virtual async Task<PaginatedResult<T>> GetPageAsync(
            Expression<Func<T, bool>> predicate,
            int page,
            int pageSize,
            Func<IQueryable<T>, IOrderedQueryable<T>> orderBy)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var query = _collection.AsQueryable()
                                   .Where(predicate)
                                   .Where(x => x.StateFlag == StateFlags.ACTIVE);

            var ordered = orderBy != null ? orderBy(query) : query.OrderBy(_ => 0);
            var total = ordered.Count();
            var items = ordered.Skip((page - 1) * pageSize)
                               .Take(pageSize)
                               .ToList();

            return new PaginatedResult<T>(items, total, page, pageSize);
        }

        public virtual async Task<IEnumerable<T>> GetAllIncludingDeletedAsync()
        {
            return await _collection.Find(_ => true).ToListAsync();
        }

        public virtual async Task<IEnumerable<T>> GetDeletedAsync()
        {
            return await _collection.Find(x => x.StateFlag == StateFlags.DELETED).ToListAsync();
        }
    }
}
