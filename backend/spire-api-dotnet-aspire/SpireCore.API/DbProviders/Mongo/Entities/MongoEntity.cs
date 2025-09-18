using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SpireCore.API.Contracts.Entities;
using System.ComponentModel;

namespace SpireCore.API.DbProviders.Mongo.Entities;

/// <summary>
/// Base class for any Mongo-backed entity.
/// Marks <see cref="Id"/> as the BSON _id field.
/// </summary>
public abstract class MongoEntity : Entity<Guid>
{
    [BsonId, BsonRepresentation(BsonType.String)]
    public new Guid Id { get; set; } = Guid.NewGuid();

    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public override DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public override DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Optional: Metadata for extensibility (JSON/dictionary).
    /// </summary>
    [BsonIgnoreIfNull]
    [DefaultValue(null)]
    public Dictionary<string, object>? Metadata { get; set; }
}