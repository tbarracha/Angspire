using Genspire.Application.Modules.Agentic.Projects.Domain.Models;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.DbProviders.Mongo.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.Agentic.Projects.Domain.Repositories;
public class ProjectRepository : MongoAuditableEntityRepository<Project>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "Projects";
    public ProjectRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}

public class ProjectTeamRepository : MongoAuditableEntityRepository<ProjectTeam>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "ProjectTeams";
    public ProjectTeamRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}

public class ProjectMembershipRepository : MongoAuditableEntityRepository<ProjectMembership>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "ProjectMemberships";
    public ProjectMembershipRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}

public class ProjectRoleRepository : MongoAuditableEntityRepository<ProjectRole>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "ProjectRoles";
    public ProjectRoleRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}

public class ProjectFavoriteRepository : MongoAuditableEntityRepository<ProjectFavorite>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "ProjectFavorites";
    public ProjectFavoriteRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}