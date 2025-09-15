using Genspire.Application.Modules.Agentic.Projects.Domain.Models;
using SpireCore.Utils;

namespace Genspire.Application.Modules.Agentic.Projects;
/// <summary>
/// Default Project Roles with deterministic GUIDs (global roles, ProjectId = null).
/// Mirrors the style used for DefaultGroupRoles.
/// </summary>
public static class DefaultProjectRoles
{
    public static readonly ProjectRole Owner = new ProjectRole
    {
        Id = GuidUtility.CreateDeterministicGuid("project-role:owner"),
        ProjectId = null, // global role
        Name = "Owner",
        Description = "Full control over the project"
    };
    public static readonly ProjectRole Admin = new ProjectRole
    {
        Id = GuidUtility.CreateDeterministicGuid("project-role:admin"),
        ProjectId = null,
        Name = "Admin",
        Description = "Manage settings, members, and integrations"
    };
    public static readonly ProjectRole Maintainer = new ProjectRole
    {
        Id = GuidUtility.CreateDeterministicGuid("project-role:maintainer"),
        ProjectId = null,
        Name = "Maintainer",
        Description = "Elevated permissions for day-to-day operations"
    };
    public static readonly ProjectRole Contributor = new ProjectRole
    {
        Id = GuidUtility.CreateDeterministicGuid("project-role:contributor"),
        ProjectId = null,
        Name = "Contributor",
        Description = "Contribute features and fixes"
    };
    public static readonly ProjectRole Viewer = new ProjectRole
    {
        Id = GuidUtility.CreateDeterministicGuid("project-role:viewer"),
        ProjectId = null,
        Name = "Viewer",
        Description = "Read-only access to project resources"
    };
    /// <summary>
    /// All default project roles for global seeding.
    /// </summary>
    public static readonly ProjectRole[] All = new[]
    {
        Owner,
        Admin,
        Maintainer,
        Contributor,
        Viewer
    };
}