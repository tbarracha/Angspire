// File: SpireCore.API.DbProviders.Mongo/MongoServiceCollectionExtensions.cs
using System.Reflection;
using MongoDB.Bson;
using MongoDB.Driver;
using SpireCore.API.DbProviders.Mongo.Entities;

namespace SpireCore.API.DbProviders.Mongo;

public static class MongoIndexInitializer
{
    public static async Task EnsureIndexesAsync(
        IMongoDatabase db,
        IEnumerable<Assembly> assemblies,
        Func<Type, string>? collectionNameResolver = null,
        CancellationToken ct = default)
    {
        var types = assemblies
            .SelectMany(a => SafeGetTypes(a))
            .Where(t => !t.IsAbstract && typeof(MongoEntity).IsAssignableFrom(t))
            .ToArray();

        foreach (var type in types)
        {
            var collectionName = ResolveCollectionName(type, collectionNameResolver);
            var col = db.GetCollection<BsonDocument>(collectionName);

            var models = BuildAttributeIndexModels(type);

            if (models.Count > 0)
                await col.Indexes.CreateManyAsync(models, ct);
        }
    }

    internal static List<CreateIndexModel<BsonDocument>> BuildAttributeIndexModels(Type type)
    {
        // Gather attributes from type + base hierarchy
        var single = GetAllAttributes<MongoIndexAttribute>(type);
        var compound = GetAllAttributes<MongoCompoundIndexAttribute>(type);
        var ttls = GetAllAttributes<MongoTtlIndexAttribute>(type);

        var models = new List<CreateIndexModel<BsonDocument>>();

        foreach (var ix in single)
        {
            var keys = ix.Sort == IndexSort.Asc
                ? Builders<BsonDocument>.IndexKeys.Ascending(ix.Field)
                : Builders<BsonDocument>.IndexKeys.Descending(ix.Field);

            var opts = new CreateIndexOptions<BsonDocument>
            {
                Name = ix.Name ?? $"ix_{ix.Field}_{(ix.Sort == IndexSort.Asc ? "asc" : "desc")}",
                Unique = ix.Unique,
                Sparse = ix.Sparse
            };

            if (!string.IsNullOrWhiteSpace(ix.PartialFilterJson))
                opts.PartialFilterExpression = new BsonDocumentFilterDefinition<BsonDocument>(BsonDocument.Parse(ix.PartialFilterJson));

            models.Add(new CreateIndexModel<BsonDocument>(keys, opts));
        }

        foreach (var cx in compound)
        {
            if (cx.Fields is not { Length: > 0 }) continue;

            var parts = new List<IndexKeysDefinition<BsonDocument>>(cx.Fields.Length);
            for (int i = 0; i < cx.Fields.Length; i++)
            {
                var field = cx.Fields[i];
                var dir = (cx.Sorts.Length > i ? cx.Sorts[i] : IndexSort.Asc);
                parts.Add(dir == IndexSort.Asc
                    ? Builders<BsonDocument>.IndexKeys.Ascending(field)
                    : Builders<BsonDocument>.IndexKeys.Descending(field));
            }

            var keysDef = parts.Count == 1 ? parts[0] : Builders<BsonDocument>.IndexKeys.Combine(parts);

            var opts = new CreateIndexOptions<BsonDocument>
            {
                Name = cx.Name ?? $"ix_{string.Join("_", cx.Fields)}",
                Unique = cx.Unique,
                Sparse = cx.Sparse
            };

            if (!string.IsNullOrWhiteSpace(cx.PartialFilterJson))
                opts.PartialFilterExpression = new BsonDocumentFilterDefinition<BsonDocument>(BsonDocument.Parse(cx.PartialFilterJson));

            models.Add(new CreateIndexModel<BsonDocument>(keysDef, opts));
        }

        foreach (var ttl in ttls)
        {
            var keys = Builders<BsonDocument>.IndexKeys.Ascending(ttl.Field);
            var opts = new CreateIndexOptions<BsonDocument>
            {
                Name = ttl.Name ?? $"ttl_{ttl.Field}",
                ExpireAfter = ttl.Seconds > 0 ? TimeSpan.FromSeconds(ttl.Seconds) : null
            };
            models.Add(new CreateIndexModel<BsonDocument>(keys, opts));
        }

        return models;
    }

    internal static string ResolveCollectionName(Type t, Func<Type, string>? resolver)
    {
        if (t.GetCustomAttribute<MongoCollectionAttribute>() is { } colAttr)
            return colAttr.Name;

        if (resolver is not null) return resolver(t);

        // Default convention: pluralize with "s"
        return t.Name.EndsWith("s", StringComparison.OrdinalIgnoreCase) ? t.Name : $"{t.Name}s";
    }

    private static IEnumerable<Type> SafeGetTypes(Assembly a)
    {
        try { return a.GetTypes(); } catch { return Array.Empty<Type>(); }
    }

    private static IReadOnlyList<TAttr> GetAllAttributes<TAttr>(Type t) where TAttr : Attribute
    {
        var list = new List<TAttr>();
        for (var cur = t; cur is not null && cur != typeof(object); cur = cur.BaseType!)
            list.AddRange(cur.GetCustomAttributes(typeof(TAttr), inherit: false).Cast<TAttr>());
        return list;
    }
}
