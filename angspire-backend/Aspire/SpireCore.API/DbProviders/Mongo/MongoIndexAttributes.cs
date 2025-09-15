// File: SpireCore.API.DbProviders.Mongo/Indexing/MongoIndexAttributes.cs
using System;

namespace SpireCore.API.DbProviders.Mongo
{
    public enum IndexSort { Asc = 1, Desc = -1 }

    [AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
    public sealed class MongoCollectionAttribute : Attribute
    {
        public string Name { get; }
        public MongoCollectionAttribute(string name) => Name = name;
    }

    [AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = true)]
    public sealed class MongoIndexAttribute : Attribute
    {
        /// <summary>Single-field index. Use Compound for multi-field.</summary>
        public string Field { get; }
        public IndexSort Sort { get; init; } = IndexSort.Asc;
        public bool Unique { get; init; }
        public bool Sparse { get; init; }
        public string? Name { get; init; }
        /// <summary>BSON/JSON partial filter document (optional).</summary>
        public string? PartialFilterJson { get; init; }

        public MongoIndexAttribute(string field) => Field = field;
    }

    [AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = true)]
    public sealed class MongoCompoundIndexAttribute : Attribute
    {
        /// <summary>Fields in order for the compound index.</summary>
        public string[] Fields { get; }
        public IndexSort[] Sorts { get; init; } = Array.Empty<IndexSort>();
        public bool Unique { get; init; }
        public bool Sparse { get; init; }
        public string? Name { get; init; }
        public string? PartialFilterJson { get; init; }

        public MongoCompoundIndexAttribute(params string[] fields) => Fields = fields;
    }

    [AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = true)]
    public sealed class MongoTtlIndexAttribute : Attribute
    {
        /// <summary>DateTime field name to TTL on (Mongo requirement).</summary>
        public string Field { get; }
        /// <summary>Expire after N seconds since Field. (0 => per-document expireAt value.)</summary>
        public int Seconds { get; init; }
        public string? Name { get; init; }

        public MongoTtlIndexAttribute(string field, int seconds) { Field = field; Seconds = seconds; }
    }
}
