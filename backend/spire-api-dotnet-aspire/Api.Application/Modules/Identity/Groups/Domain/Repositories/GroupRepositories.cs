using Genspire.Application.Modules.Identity.Groups.Domain.Models;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.DbProviders.Mongo.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.Identity.Groups.Domain.Repositories;
public class GroupTypeRepository : MongoAuditableEntityRepository<GroupType>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "GroupTypes";
    public GroupTypeRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}

public class GroupRepository : MongoAuditableEntityRepository<Group>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "Groups";
    public GroupRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}

public class GroupMembershipRepository : MongoAuditableEntityRepository<GroupMembership>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "GroupMemberships";
    public GroupMembershipRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}

public class GroupRoleRepository : MongoAuditableEntityRepository<GroupRole>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "GroupRoles";
    public GroupRoleRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}

public class GroupFavoriteRepository : MongoAuditableEntityRepository<GroupFavorite>, ITransientService
{
    private const string ModuleName = "GenAi";
    private const string CollectionName = "GroupFavorites";
    public GroupFavoriteRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
    {
    }
}