using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SpireCore.API.DbProviders.Mongo.Entities;
using System.ComponentModel;

namespace Identity.Groups.Models;

public class GroupType : MongoAuditableEntity
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class Group : MongoAuditableEntity
{
    public string Name { get; set; } = default!;

    [BsonRepresentation(BsonType.String)]
    public Guid GroupTypeId { get; set; }

    [BsonIgnoreIfNull]
    [DefaultValue(null)]
    public string? Description { get; set; }

    [BsonIgnoreIfNull]
    [DefaultValue(null)]
    [BsonRepresentation(BsonType.String)]
    public Guid? OwnerUserId { get; set; }

    [BsonIgnoreIfNull]
    [DefaultValue(null)]
    [BsonRepresentation(BsonType.String)]
    public Guid? ParentGroupId { get; set; }
}

public class GroupMembership : MongoAuditableEntity
{
    [BsonRepresentation(BsonType.String)]
    public Guid GroupId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid? RoleId { get; set; }
    public string? State { get; set; }

    [BsonDefaultValue(false)]
    [DefaultValue(false)]
    public bool IsGroupOwner { get; set; } = false;
}

public class GroupRole : MongoAuditableEntity
{
    [BsonRepresentation(BsonType.String)]
    public Guid? GroupId { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class GroupFavorite : MongoAuditableEntity
{
    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid GroupId { get; set; }
    public DateTime FavoritedAt { get; set; } = DateTime.UtcNow;
}