using SpireCore.Constants;
using SpireCore.Lists.Pagination;
using SpireCore.Repositories;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;

namespace SpireCore.JsonDatabase;

public class JsonDatabaseRepository<T> : IRepository<T>, ISoftDeleteRepository<T> where T : class
{
    private readonly string _filePath;
    private List<T> _data;
    private readonly EntityPropertyHelper<T> _propertyHelper;

    public JsonDatabaseRepository(JsonDatabaseConfig config)
    {
        _filePath = config.GetFullPath(typeof(T));
        _propertyHelper = new EntityPropertyHelper<T>();
        _data = LoadData();
    }

    // --------------------------- Data Operations ---------------------------
    private List<T> LoadData()
    {
        if (!File.Exists(_filePath))
            return new List<T>();

        var json = File.ReadAllText(_filePath);
        return JsonSerializer.Deserialize<List<T>>(json) ?? new List<T>();
    }

    private async Task PersistDataAsync()
    {
        var json = JsonSerializer.Serialize(_data, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_filePath, json);
    }

    // --------------------------- IReadonlyRepository<T> ---------------------------
    public async Task<IEnumerable<T>> GetAllAsync()
    {
        if (_propertyHelper.HasStateFlag)
            return await Task.FromResult(_data.Where(x => _propertyHelper.GetStateFlag(x) == StateFlags.ACTIVE));

        return await Task.FromResult(_data.AsEnumerable());
    }

    public async Task<T?> FindAsync(Expression<Func<T, bool>> predicate)
    {
        var compiled = predicate.Compile();
        var query = _data.AsQueryable();

        if (_propertyHelper.HasStateFlag)
            query = query.Where(x => _propertyHelper.GetStateFlag(x) == StateFlags.ACTIVE);

        return await Task.FromResult(query.FirstOrDefault(compiled));
    }

    public async Task<IEnumerable<T>> FindAllAsync(Expression<Func<T, bool>> predicate)
    {
        var compiled = predicate.Compile();
        var query = _data.AsQueryable();

        if (_propertyHelper.HasStateFlag)
            query = query.Where(x => _propertyHelper.GetStateFlag(x) == StateFlags.ACTIVE);

        return await Task.FromResult(query.Where(compiled).ToList());
    }

    // --------------------------- IRepository<T> ---------------------------
    public async Task<T> AddAsync(T entity)
    {
        _propertyHelper.SetCreatedTimestamp(entity);
        _propertyHelper.SetStateFlag(entity, StateFlags.ACTIVE);

        _data.Add(entity);
        await PersistDataAsync();
        return entity;
    }

    public async Task<T> UpdateAsync(T entity)
    {
        var index = _data.FindIndex(x => x.Equals(entity));
        if (index < 0)
            throw new InvalidOperationException("Entity not found");

        _propertyHelper.SetUpdatedTimestamp(entity);
        _data[index] = entity;
        await PersistDataAsync();
        return entity;
    }

    public async Task<T> UpdateAsync(Expression<Func<T, bool>> predicate, T newEntity)
    {
        var compiled = predicate.Compile();
        var index = _data.FindIndex(x => compiled(x));

        if (index < 0)
            throw new InvalidOperationException("Entity not found");

        _propertyHelper.SetUpdatedTimestamp(newEntity);
        _data[index] = newEntity;
        await PersistDataAsync();
        return newEntity;
    }

    public async Task<T> DeleteAsync(Expression<Func<T, bool>> predicate)
    {
        var compiled = predicate.Compile();
        var entity = _data.FirstOrDefault(compiled);

        if (entity == null)
            throw new InvalidOperationException("Entity not found");

        _data.Remove(entity);
        await PersistDataAsync();
        return entity;
    }

    public async Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entities)
    {
        var items = entities.ToList();
        var now = DateTime.UtcNow;

        foreach (var entity in items)
        {
            _propertyHelper.SetCreatedTimestamp(entity, now);
            _propertyHelper.SetStateFlag(entity, StateFlags.ACTIVE);
        }

        _data.AddRange(items);
        await PersistDataAsync();
        return items;
    }

    public async Task<IEnumerable<T>> UpdateRangeAsync(IEnumerable<T> entities)
    {
        var items = entities.ToList();
        var now = DateTime.UtcNow;

        foreach (var entity in items)
        {
            _propertyHelper.SetUpdatedTimestamp(entity, now);

            var index = _data.FindIndex(x => x.Equals(entity));
            if (index >= 0)
            {
                _data[index] = entity;
            }
        }

        await PersistDataAsync();
        return items;
    }

    public async Task<T> DeleteAsync(T entity)
    {
        var index = _data.FindIndex(x => x.Equals(entity));
        if (index < 0)
            throw new InvalidOperationException("Entity not found");

        _data.RemoveAt(index);
        await PersistDataAsync();
        return entity;
    }

    public async Task<int> DeleteRangeAsync(IEnumerable<T> entities)
    {
        var items = entities.ToList();
        var count = _data.RemoveAll(x => items.Contains(x));
        await PersistDataAsync();
        return count;
    }

    public async Task<int> DeleteRangeAsync(Expression<Func<T, bool>> predicate)
    {
        var compiled = predicate.Compile();
        var count = _data.RemoveAll(new Predicate<T>(compiled));
        await PersistDataAsync();
        return count;
    }

    // --------------------------- IPagination<T> ---------------------------
    public async Task<PaginatedResult<T>> GetPageAsync(int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Max(1, pageSize);

        var query = _data.AsQueryable();

        if (_propertyHelper.HasStateFlag)
            query = query.Where(x => _propertyHelper.GetStateFlag(x) == StateFlags.ACTIVE);

        var totalCount = query.Count();
        var items = query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return await Task.FromResult(new PaginatedResult<T>(items, totalCount, page, pageSize));
    }

    public async Task<PaginatedResult<T>> GetPageAsync(
        Expression<Func<T, bool>> filter,
        int page,
        int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Max(1, pageSize);

        var compiled = filter.Compile();
        var query = _data.AsQueryable().Where(compiled);

        if (_propertyHelper.HasStateFlag)
            query = query.Where(x => _propertyHelper.GetStateFlag(x) == StateFlags.ACTIVE);

        var totalCount = query.Count();
        var items = query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return await Task.FromResult(new PaginatedResult<T>(items, totalCount, page, pageSize));
    }

    public async Task<PaginatedResult<T>> GetPageAsync(
        Expression<Func<T, bool>> filter,
        int page,
        int pageSize,
        Func<IQueryable<T>, IOrderedQueryable<T>> orderBy)
    {
        page = Math.Max(1, page);
        pageSize = Math.Max(1, pageSize);

        var query = _data.AsQueryable().Where(filter);

        if (_propertyHelper.HasStateFlag)
            query = query.Where(x => _propertyHelper.GetStateFlag(x) == StateFlags.ACTIVE);

        var ordered = orderBy != null ? orderBy(query) : query.OrderBy(_ => 0);
        var total = ordered.Count();
        var items = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return await Task.FromResult(new PaginatedResult<T>(items, total, page, pageSize));
    }

    // --------------------------- ISoftDeleteRepository<T> ---------------------------
    public async Task<T> SoftDeleteAsync(T entity)
    {
        if (!_propertyHelper.HasStateFlag)
            throw new NotSupportedException("Entity type does not support soft delete");

        _propertyHelper.SetStateFlag(entity, StateFlags.DELETED);
        await PersistDataAsync();
        return entity;
    }

    public async Task<T> SoftDeleteAsync(Expression<Func<T, bool>> predicate)
    {
        if (!_propertyHelper.HasStateFlag)
            throw new NotSupportedException("Entity type does not support soft delete");

        var compiled = predicate.Compile();
        var entity = _data.FirstOrDefault(compiled);

        if (entity == null)
            throw new InvalidOperationException("Entity not found");

        _propertyHelper.SetStateFlag(entity, StateFlags.DELETED);
        await PersistDataAsync();
        return entity;
    }

    public async Task<IEnumerable<T>> SoftDeleteRangeAsync(IEnumerable<T> entities)
    {
        if (!_propertyHelper.HasStateFlag)
            throw new NotSupportedException("Entity type does not support soft delete");

        var items = entities.ToList();
        foreach (var entity in items)
        {
            _propertyHelper.SetStateFlag(entity, StateFlags.DELETED);
        }

        await PersistDataAsync();
        return items;
    }

    public async Task<int> SoftDeleteRangeAsync(Expression<Func<T, bool>> predicate)
    {
        if (!_propertyHelper.HasStateFlag)
            throw new NotSupportedException("Entity type does not support soft delete");

        var compiled = predicate.Compile();
        var entities = _data.Where(compiled).ToList();

        foreach (var entity in entities)
        {
            _propertyHelper.SetStateFlag(entity, StateFlags.DELETED);
        }

        await PersistDataAsync();
        return entities.Count;
    }

    public async Task<T> RestoreAsync(Expression<Func<T, bool>> predicate)
    {
        if (!_propertyHelper.HasStateFlag)
            throw new NotSupportedException("Entity type does not support soft delete");

        var compiled = predicate.Compile();
        var entity = _data.FirstOrDefault(compiled);

        if (entity == null)
            throw new InvalidOperationException("Entity not found");

        _propertyHelper.SetStateFlag(entity, StateFlags.ACTIVE);
        await PersistDataAsync();
        return entity;
    }

    public async Task<IEnumerable<T>> RestoreRangeAsync(IEnumerable<T> entities)
    {
        if (!_propertyHelper.HasStateFlag)
            throw new NotSupportedException("Entity type does not support soft delete");

        var items = entities.ToList();
        foreach (var entity in items)
        {
            _propertyHelper.SetStateFlag(entity, StateFlags.ACTIVE);
        }

        await PersistDataAsync();
        return items;
    }

    public async Task<int> RestoreRangeAsync(Expression<Func<T, bool>> predicate)
    {
        if (!_propertyHelper.HasStateFlag)
            throw new NotSupportedException("Entity type does not support soft delete");

        var compiled = predicate.Compile();
        var entities = _data.Where(compiled).ToList();

        foreach (var entity in entities)
        {
            _propertyHelper.SetStateFlag(entity, StateFlags.ACTIVE);
        }

        await PersistDataAsync();
        return entities.Count;
    }

    public async Task<IEnumerable<T>> GetAllIncludingDeletedAsync()
        => await Task.FromResult(_data.AsEnumerable());

    public async Task<IEnumerable<T>> GetDeletedAsync()
    {
        if (!_propertyHelper.HasStateFlag)
            return await Task.FromResult(Enumerable.Empty<T>());

        return await Task.FromResult(_data.Where(x => _propertyHelper.GetStateFlag(x) == StateFlags.DELETED).ToList());
    }

    public async Task<T?> FindDeletedAsync(Expression<Func<T, bool>> predicate)
    {
        if (!_propertyHelper.HasStateFlag)
            return await Task.FromResult(default(T));

        var compiled = predicate.Compile();
        return await Task.FromResult(_data
            .Where(x => _propertyHelper.GetStateFlag(x) == StateFlags.DELETED)
            .FirstOrDefault(compiled));
    }

    public async Task<IEnumerable<T>> FindAllDeletedAsync(Expression<Func<T, bool>> predicate)
    {
        if (!_propertyHelper.HasStateFlag)
            return await Task.FromResult(Enumerable.Empty<T>());

        var compiled = predicate.Compile();
        return await Task.FromResult(_data
            .Where(x => _propertyHelper.GetStateFlag(x) == StateFlags.DELETED)
            .Where(compiled)
            .ToList());
    }
}

// --------------------------- Helper Class ---------------------------
internal class EntityPropertyHelper<T> where T : class
{
    private readonly PropertyInfo? _stateFlagProperty;
    private readonly PropertyInfo? _createdAtProperty;
    private readonly PropertyInfo? _updatedAtProperty;

    public bool HasStateFlag => _stateFlagProperty != null;
    public bool HasTimestamps => _createdAtProperty != null && _updatedAtProperty != null;

    public EntityPropertyHelper()
    {
        _stateFlagProperty = typeof(T).GetProperty("StateFlag");
        _createdAtProperty = typeof(T).GetProperty("CreatedAt");
        _updatedAtProperty = typeof(T).GetProperty("UpdatedAt");
    }

    public string GetStateFlag(T entity)
        => _stateFlagProperty?.GetValue(entity) as string ?? StateFlags.ACTIVE;

    public void SetStateFlag(T entity, string state)
    {
        if (_stateFlagProperty?.CanWrite == true)
        {
            _stateFlagProperty.SetValue(entity, state);
            SetUpdatedTimestamp(entity);
        }
    }

    public void SetCreatedTimestamp(T entity, DateTime? timestamp = null)
    {
        if (_createdAtProperty?.CanWrite == true)
        {
            _createdAtProperty.SetValue(entity, timestamp ?? DateTime.UtcNow);
        }
    }

    public void SetUpdatedTimestamp(T entity, DateTime? timestamp = null)
    {
        if (_updatedAtProperty?.CanWrite == true)
        {
            _updatedAtProperty.SetValue(entity, timestamp ?? DateTime.UtcNow);
        }
    }
}