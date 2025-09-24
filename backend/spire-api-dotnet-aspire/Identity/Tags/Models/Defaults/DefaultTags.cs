using SpireCore.Constants;
using SpireCore.Utils;

namespace Identity.Tags.Models.Defaults;

/// <summary>
/// Provides default Tag instances (deterministic GUIDs, icons, categories).
/// </summary>
public static class DefaultTags
{
    // AI Generation-related tags
    public static class AiGeneration
    {
        public static readonly Tag Text = new Tag
        {
            Id = GuidUtility.CreateDeterministicGuid("generation-tag:text"),
            DisplayName = "Text",
            Icon = "💬",
            IconType = IconTypeConstants.Emoji,
            Description = "Text-based generation",
            CategoryId = DefaultTagCategories.AiGeneration.Id,
            ParentTagId = null
        };
        public static readonly Tag Embedding = new Tag
        {
            Id = GuidUtility.CreateDeterministicGuid("generation-tag:embedding"),
            DisplayName = "Embedding",
            Icon = "🧠",
            IconType = IconTypeConstants.Emoji,
            Description = "Vector embeddings",
            CategoryId = DefaultTagCategories.AiGeneration.Id,
            ParentTagId = null
        };
        public static readonly Tag Audio = new Tag
        {
            Id = GuidUtility.CreateDeterministicGuid("generation-tag:audio"),
            DisplayName = "Audio",
            Icon = "🔊",
            IconType = IconTypeConstants.Emoji,
            Description = "Audio generation",
            CategoryId = DefaultTagCategories.AiGeneration.Id,
            ParentTagId = null
        };
        public static readonly Tag Image = new Tag
        {
            Id = GuidUtility.CreateDeterministicGuid("generation-tag:image"),
            DisplayName = "Image",
            Icon = "🖼️",
            IconType = IconTypeConstants.Emoji,
            Description = "Image generation",
            CategoryId = DefaultTagCategories.AiGeneration.Id,
            ParentTagId = null
        };
        public static readonly Tag Video = new Tag
        {
            Id = GuidUtility.CreateDeterministicGuid("generation-tag:video"),
            DisplayName = "Video",
            Icon = "🎞️",
            IconType = IconTypeConstants.Emoji,
            Description = "Video generation",
            CategoryId = DefaultTagCategories.AiGeneration.Id,
            ParentTagId = null
        };
        public static readonly Tag Reasoning = new Tag
        {
            Id = GuidUtility.CreateDeterministicGuid("generation-tag:reasoning"),
            DisplayName = "Reasoning",
            Icon = "🤔",
            IconType = IconTypeConstants.Emoji,
            Description = "Logical reasoning",
            CategoryId = DefaultTagCategories.AiGeneration.Id,
            ParentTagId = null
        };
        public static readonly Tag Tool = new Tag
        {
            Id = GuidUtility.CreateDeterministicGuid("generation-tag:tool"),
            DisplayName = "Tool Use",
            Icon = "🛠️",
            IconType = IconTypeConstants.Emoji,
            Description = "Invoke external tools",
            CategoryId = DefaultTagCategories.AiGeneration.Id,
            ParentTagId = null
        };
        public static readonly Tag File = new Tag
        {
            Id = GuidUtility.CreateDeterministicGuid("generation-tag:file"),
            DisplayName = "File",
            Icon = "📄",
            IconType = IconTypeConstants.Emoji,
            Description = "File-based inputs/outputs",
            CategoryId = DefaultTagCategories.AiGeneration.Id,
            ParentTagId = null
        };
        /// <summary>
        /// All generation tags.
        /// </summary>
        public static readonly Tag[] All = new[]
        {
            Text,
            Embedding,
            Audio,
            Image,
            Video,
            Reasoning,
            Tool,
            File
        };
    }

    // Other domain tags (persona, system, etc.)
    public static readonly Tag System = new Tag
    {
        Id = GuidUtility.CreateDeterministicGuid("tag:system"),
        DisplayName = "System",
        Icon = "🔧",
        IconType = IconTypeConstants.Emoji,
        Description = "System/internal tag",
        CategoryId = DefaultTagCategories.Generic.Id,
        ParentTagId = null
    };
    public static readonly Tag Assistant = new Tag
    {
        Id = GuidUtility.CreateDeterministicGuid("tag:assistant"),
        DisplayName = "Assistant",
        Icon = "🤖",
        IconType = IconTypeConstants.Emoji,
        Description = "Assistant persona",
        CategoryId = DefaultTagCategories.Generic.Id,
        ParentTagId = null
    };
    public static readonly Tag Agent = new Tag
    {
        Id = GuidUtility.CreateDeterministicGuid("tag:agent"),
        DisplayName = "Agent",
        Icon = "🤖",
        IconType = IconTypeConstants.Emoji,
        Description = "Agent persona",
        CategoryId = DefaultTagCategories.Generic.Id,
        ParentTagId = null
    };
    // You may add more tags in the same pattern...
    /// <summary>
    /// All tags across all groups (flat array for global seeding).
    /// </summary>
    public static readonly Tag[] All = AiGeneration.All.Concat(new[] { System, Assistant, Agent /*, ... more */ }).ToArray();
}