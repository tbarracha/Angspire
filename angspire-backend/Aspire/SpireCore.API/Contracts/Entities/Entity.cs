using MongoDB.Bson.Serialization.Attributes;
using SpireCore.Constants;
using System.ComponentModel;

namespace SpireCore.API.Contracts.Entities;

public abstract class Entity<TId> : IEntity<TId>
{
    [BsonIgnore]
    public virtual TId Id { get; set; }

    [BsonIgnore]
    public virtual DateTime CreatedAt { get; set; } = DateTime.Now;

    [BsonIgnore]
    public virtual DateTime UpdatedAt { get; set; }

    [DefaultValue(StateFlags.ACTIVE)]
    public string StateFlag { get; set; } = StateFlags.ACTIVE;
}
