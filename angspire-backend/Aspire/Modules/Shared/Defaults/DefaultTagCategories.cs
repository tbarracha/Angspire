using App.Core.Identity.Tags.Models;
using SpireCore.Utils;

namespace App.Shared.Defaults;

public static class DefaultTagCategories
{
    public static readonly TagCategory Generic = new TagCategory
    {
        Id = GuidUtility.CreateDeterministicGuid("TagCategory:Generic"),
        Name = "Generic",
        Description = "General purpose tags.",
        Icon = "🏷️",
        IconType = "emoji",
        ParentCategoryId = null
    };

    public static readonly TagCategory AiGeneration = new TagCategory
    {
        Id = GuidUtility.CreateDeterministicGuid("TagCategory:AiGeneration"),
        Name = "AI Generation",
        Description = "AI generation tag category.",
        Icon = "✨",
        IconType = "emoji",
        ParentCategoryId = null
    };

    public static readonly TagCategory[] All =
    {
        Generic,
        AiGeneration
    };
}