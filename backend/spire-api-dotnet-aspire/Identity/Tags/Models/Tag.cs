using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SpireCore.API.DbProviders.Mongo.Entities;

namespace Identity.Tags.Models;

public class Tag : MongoEntity
{
    /// <summary>
    /// Display name for UI (e.g., "Text", "Image").
    /// </summary>
    public string DisplayName { get; set; } = default!;
    /// <summary>
    /// Optional emoji or icon.
    /// </summary>
    public string? Icon { get; set; }
    /// <summary>
    /// Optional Icon type (e.g., "emoji", "svg", "url", "fa", etc.).
    /// </summary>
    public string? IconType { get; set; }
    /// <summary>
    /// Description for devs or users.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Reference to the tag category.
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    public Guid CategoryId { get; set; } = default!;

    [BsonRepresentation(BsonType.String)]
    public Guid? ParentTagId { get; set; }
}