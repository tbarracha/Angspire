using System.Reflection;

namespace SpireCore.API.Operations.Attributes;

[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class OperationGroupAttribute : Attribute
{
    public string GroupName { get; }
    public bool Pinned { get; }

    /// <summary>
    /// Marks an operation's group and whether it should be pinned to the top of Swagger group ordering.
    /// </summary>
    public OperationGroupAttribute(string groupName, bool pinned = false)
    {
        GroupName = groupName?.Trim() ?? "misc";
        Pinned = pinned;
    }

    /// <summary>
    /// Back-compat helper (existing call sites keep working).
    /// </summary>
    public static string GetGroupName(Type opType) => GetGroup(opType).Name;

    /// <summary>
    /// New helper: returns whether the group is pinned.
    /// </summary>
    public static bool IsPinned(Type opType) => GetGroup(opType).Pinned;

    /// <summary>
    /// New helper: returns both name and pinned with sensible fallbacks.
    /// </summary>
    public static (string Name, bool Pinned) GetGroup(Type opType)
    {
        // Try attribute first
        var groupAttr = opType.GetCustomAttribute<OperationGroupAttribute>();
        if (groupAttr != null && !string.IsNullOrWhiteSpace(groupAttr.GroupName))
            return (groupAttr.GroupName, groupAttr.Pinned);

        // Derive from namespace if no attribute
        var ns = opType.Namespace;
        if (!string.IsNullOrWhiteSpace(ns))
        {
            var parts = ns.Split('.');
            var idx = Array.IndexOf(parts, "Operations");

            if (idx >= 0)
            {
                // If "Operations" is last, use the previous segment
                if (idx == parts.Length - 1 && idx > 0)
                    return (parts[idx - 1], false);

                // If "Operations" has a group after, use the next segment
                if (idx < parts.Length - 1)
                    return (parts[idx + 1], false);
            }
        }

        // Fallback
        return ("misc", false);
    }
}
