using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SpireCore.API.DbProviders.Mongo.Entities;
using System.ComponentModel;

namespace Genspire.Application.Modules.Agentic.Projects.Domain.Models;
public class Project : MongoAuditableEntity
{
    public string Name { get; set; } = default!;

    [BsonRepresentation(BsonType.String)]
    public Guid GroupId { get; set; }

    [BsonIgnoreIfNull]
    [DefaultValue(null)]
    [BsonRepresentation(BsonType.String)]
    public Guid? OwnerUserId { get; set; }

    [BsonIgnoreIfNull]
    [DefaultValue(null)]
    public string? Description { get; set; }

    [BsonIgnoreIfNull]
    [DefaultValue(null)]
    public string? ImageUrl { get; set; }
}

public class ProjectTeam : MongoAuditableEntity
{
    public string Name { get; set; } = default!;

    [BsonRepresentation(BsonType.String)]
    public Guid ProjectId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid GroupId { get; set; }
    public string? Description { get; set; }
}

public class ProjectMembership : MongoAuditableEntity
{
    [BsonRepresentation(BsonType.String)]
    public Guid ProjectId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid? RoleId { get; set; }
    public string? State { get; set; }
}

public class ProjectRole : MongoAuditableEntity
{
    [BsonRepresentation(BsonType.String)]
    public Guid? ProjectId { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class ProjectFavorite : MongoAuditableEntity
{
    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid ProjectId { get; set; }
    public DateTime FavoritedAt { get; set; } = DateTime.UtcNow;

    // Optionally for aggregation/navigation:
    [BsonIgnoreIfNull]
    public Project? Project { get; set; }
}