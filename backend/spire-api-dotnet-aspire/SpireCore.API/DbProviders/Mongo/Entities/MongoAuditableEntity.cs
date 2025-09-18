using MongoDB.Bson.Serialization.Attributes;
using SpireCore.API.Contracts.Entities;
using System.ComponentModel;

namespace SpireCore.API.DbProviders.Mongo.Entities;

public abstract class MongoAuditableEntity : MongoEntity, IAuditableEntity<Guid>
{

    [BsonIgnoreIfNull]
    [DefaultValue(null)]
    public string? CreatedBy { get; set; }

    [BsonIgnoreIfNull]
    [DefaultValue(null)]
    public string? UpdatedBy { get; set; }
}
