using Identity.Groups.Models;
using Shared.Repositories;
using SpireCore.API.Configuration.Modules;

namespace Identity.Groups.Repositories;

public class GroupTypeRepository : DomainMongoRepository<GroupType>
{
    private const string Collection = "GroupTypes";

    public GroupTypeRepository(IModuleDatabaseProvider provider) : base(provider, Collection) { }
}

public class GroupRepository : DomainMongoRepository<Group>
{
    private const string Collection = "Groups";

    public GroupRepository(IModuleDatabaseProvider provider) : base(provider, Collection) { }
}

public class GroupMembershipRepository : DomainMongoRepository<GroupMembership>
{
    private const string Collection = "GroupMemberships";

    public GroupMembershipRepository(IModuleDatabaseProvider provider) : base(provider, Collection) { }
}

public class GroupRoleRepository : DomainMongoRepository<GroupRole>
{
    private const string Collection = "GroupRoles";

    public GroupRoleRepository(IModuleDatabaseProvider provider) : base(provider, Collection) { }
}

public class GroupFavoriteRepository : DomainMongoRepository<GroupFavorite>
{
    private const string Collection = "GroupFavorites";

    public GroupFavoriteRepository(IModuleDatabaseProvider provider) : base(provider, Collection) { }
}
