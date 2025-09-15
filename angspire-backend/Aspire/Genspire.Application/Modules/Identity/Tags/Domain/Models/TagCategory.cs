using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SpireCore.API.DbProviders.Mongo.Entities;

namespace Genspire.Application.Modules.Identity.Tags.Domain.Models;
public class TagCategory : MongoEntity
{
    /// <summary>
    /// Category display name (e.g., "Generation", "Generic", "Persona").
    /// </summary>
    public string Name { get; set; } = default!;
    /// <summary>
    /// Optional description for the category.
    /// </summary>
    public string? Description { get; set; }
    /// <summary>
    /// Optional emoji or icon.
    /// </summary>
    public string? Icon { get; set; }
    /// <summary>
    /// Optional Icon type (e.g., "emoji", "svg", "url", "fa", etc.).
    /// </summary>
    public string? IconType { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid? ParentCategoryId { get; set; }
}