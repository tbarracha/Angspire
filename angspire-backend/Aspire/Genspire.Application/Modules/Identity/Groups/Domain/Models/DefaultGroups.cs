using Genspire.Application.Modules.Identity.Groups.Domain.Models;
using SpireCore.Utils;

namespace Genspire.Application.Modules.Identity.Groups;
/// <summary>
/// Default Group Types with deterministic GUIDs.
/// </summary>
public static class DefaultGroupTypes
{
    public static readonly GroupType Team = new GroupType
    {
        Id = GuidUtility.CreateDeterministicGuid("group-type:team"),
        Name = "Team",
        Description = "Teams working on shared goals"
    };
    public static readonly GroupType Organization = new GroupType
    {
        Id = GuidUtility.CreateDeterministicGuid("group-type:organization"),
        Name = "Organization",
        Description = "Organizations or companies"
    };
    public static readonly GroupType Community = new GroupType
    {
        Id = GuidUtility.CreateDeterministicGuid("group-type:community"),
        Name = "Community",
        Description = "Interest or topic-based communities"
    };
    public static readonly GroupType[] All = new[]
    {
        Team,
        Organization,
        Community
    };
}

/// <summary>
/// Default Group Roles with deterministic GUIDs (global roles, GroupId = null).
/// </summary>
public static class DefaultGroupRoles
{
    public static readonly GroupRole Owner = new GroupRole
    {
        Id = GuidUtility.CreateDeterministicGuid("group-role:owner"),
        GroupId = null, // global role
        Name = "Owner",
        Description = "Ultimate control over the group"
    };
    public static readonly GroupRole Admin = new GroupRole
    {
        Id = GuidUtility.CreateDeterministicGuid("group-role:admin"),
        GroupId = null,
        Name = "Admin",
        Description = "Manage settings and members"
    };
    public static readonly GroupRole Moderator = new GroupRole
    {
        Id = GuidUtility.CreateDeterministicGuid("group-role:moderator"),
        GroupId = null,
        Name = "Moderator",
        Description = "Moderate content and members"
    };
    public static readonly GroupRole Member = new GroupRole
    {
        Id = GuidUtility.CreateDeterministicGuid("group-role:member"),
        GroupId = null,
        Name = "Member",
        Description = "Standard membership role"
    };
    public static readonly GroupRole Viewer = new GroupRole
    {
        Id = GuidUtility.CreateDeterministicGuid("group-role:viewer"),
        GroupId = null,
        Name = "Viewer",
        Description = "Read-only access"
    };
    public static readonly GroupRole[] All = new[]
    {
        Owner,
        Admin,
        Moderator,
        Member,
        Viewer
    };
}