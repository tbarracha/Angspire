using Genspire.Application.Modules.Identity.Groups.Domain.Models;
using SpireCore.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.Identity.Groups.Domain.Services;
/// <summary>
/// Encapsulates all repositories needed for group-related domain logic.
/// </summary>
public class GroupRepoContext : ITransientService
{
    public IRepository<GroupType> GroupTypeRepo { get; }
    public IRepository<Group> GroupRepo { get; }
    public IRepository<GroupMembership> GroupMembershipRepo { get; }
    public IRepository<GroupRole> GroupRoleRepo { get; }
    public IRepository<GroupFavorite> GroupFavoriteRepo { get; }

    public GroupRepoContext(IRepository<GroupType> groupTypeRepo, IRepository<Group> groupRepo, IRepository<GroupMembership> groupMembershipRepo, IRepository<GroupRole> groupRoleRepo, IRepository<GroupFavorite> groupFavoriteRepo)
    {
        GroupTypeRepo = groupTypeRepo;
        GroupRepo = groupRepo;
        GroupMembershipRepo = groupMembershipRepo;
        GroupRoleRepo = groupRoleRepo;
        GroupFavoriteRepo = groupFavoriteRepo;
    }
}