using Identity.Groups.Models;
using SpireCore.Services;

namespace Identity.Groups.Services;
public class GroupService : ITransientService
{
    private readonly GroupRepoContext _repos;
    public GroupService(GroupRepoContext repos)
    {
        _repos = repos;
    }

    public async Task<Group> CreateGroupOfTypeForUserAsync(Guid userId, string groupTypeName, string? groupName = null, string? description = null)
    {
        // Case-insensitive search for group type
        var groupType = (await _repos.GroupTypeRepo.FindAllAsync(gt => gt.Name.ToLower() == groupTypeName.ToLower())).FirstOrDefault();
        // Create group type if missing
        if (groupType == null)
        {
            string groupTypeDesc = groupTypeName.ToLower() switch
            {
                "team" => "A team is a personal or small group used for collaboration between users.",
                "organization" => "An organization is a formal group structure that can contain teams and users.",
                "company" => "A company is a business entity that may encompass multiple organizations or teams.",
                _ => $"{groupTypeName} group type"
            };
            groupType = new GroupType
            {
                Id = Guid.NewGuid(),
                Name = groupTypeName,
                Description = groupTypeDesc
            };
            await _repos.GroupTypeRepo.AddAsync(groupType);
        }

        // Default group name
        var finalGroupName = !string.IsNullOrWhiteSpace(groupName) ? groupName : $"My {groupTypeName}";
        // Create group
        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = finalGroupName,
            GroupTypeId = groupType.Id,
            OwnerUserId = userId,
            Description = description
        };
        await _repos.GroupRepo.AddAsync(group);
        // Owner membership
        var membership = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = group.Id,
            UserId = userId,
            IsGroupOwner = true
        };
        await _repos.GroupMembershipRepo.AddAsync(membership);
        return group;
    }

    public Task<Group> CreateTeamGroupForUserAsync(Guid userId, string? groupName = null, string? description = null) => CreateGroupOfTypeForUserAsync(userId, "Team", groupName, description);
    public Task<Group> CreateOrganizationGroupForUserAsync(Guid userId, string? groupName = null, string? description = null) => CreateGroupOfTypeForUserAsync(userId, "Organization", groupName, description);
    public Task<Group> CreateCompanyGroupForUserAsync(Guid userId, string? groupName = null, string? description = null) => CreateGroupOfTypeForUserAsync(userId, "Company", groupName, description);
    public async Task<GroupMembership> AddUserToGroupAsync(Guid groupId, Guid userId, Guid? roleId = null)
    {
        // Prevent duplicate
        var exists = await _repos.GroupMembershipRepo.FindAsync(x => x.GroupId == groupId && x.UserId == userId);
        if (exists != null)
            return exists;
        var membership = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = userId,
            RoleId = roleId,
            IsGroupOwner = false
        };
        await _repos.GroupMembershipRepo.AddAsync(membership);
        return membership;
    }

    public async Task<bool> RemoveUserFromGroupAsync(Guid groupId, Guid userId)
    {
        var membership = await _repos.GroupMembershipRepo.FindAsync(x => x.GroupId == groupId && x.UserId == userId);
        if (membership == null)
            return false;
        await _repos.GroupMembershipRepo.DeleteAsync(x => x.Id == membership.Id);
        return true;
    }

    public async Task<bool> AddGroupRoleToUserAsync(Guid groupId, Guid userId, Guid roleId)
    {
        var membership = await _repos.GroupMembershipRepo.FindAsync(x => x.GroupId == groupId && x.UserId == userId);
        if (membership == null)
            return false;
        membership.RoleId = roleId;
        await _repos.GroupMembershipRepo.UpdateAsync(x => x.Id == membership.Id, membership);
        return true;
    }

    public async Task<bool> RemoveGroupRoleFromUserAsync(Guid groupId, Guid userId)
    {
        var membership = await _repos.GroupMembershipRepo.FindAsync(x => x.GroupId == groupId && x.UserId == userId);
        if (membership == null)
            return false;
        membership.RoleId = null;
        await _repos.GroupMembershipRepo.UpdateAsync(x => x.Id == membership.Id, membership);
        return true;
    }

    public async Task<List<Group>> ListGroupsForUserAsync(Guid userId)
    {
        var memberships = await _repos.GroupMembershipRepo.FindAllAsync(x => x.UserId == userId);
        var groupIds = memberships.Select(m => m.GroupId).ToList();
        var groups = await _repos.GroupRepo.FindAllAsync(x => groupIds.Contains(x.Id));
        return groups.ToList();
    }

    public async Task<List<Group>> ListGroupsUserOwnsAsync(Guid userId)
    {
        var groups = await _repos.GroupRepo.FindAllAsync(x => x.OwnerUserId == userId);
        return groups.ToList();
    }

    public async Task<List<Guid>> ListUsersInGroupAsync(Guid groupId)
    {
        var memberships = await _repos.GroupMembershipRepo.FindAllAsync(x => x.GroupId == groupId);
        return memberships.Select(m => m.UserId).ToList();
    }

    public async Task<List<GroupRole>> ListRolesOfUserInGroupAsync(Guid groupId, Guid userId)
    {
        var memberships = await _repos.GroupMembershipRepo.FindAllAsync(x => x.GroupId == groupId && x.UserId == userId && x.RoleId != null);
        var roleIds = memberships.Select(m => m.RoleId!.Value).Distinct().ToList();
        var roles = await _repos.GroupRoleRepo.FindAllAsync(x => roleIds.Contains(x.Id));
        return roles.ToList();
    }

    public async Task<bool> IsUserMemberOfGroupAsync(Guid groupId, Guid userId)
    {
        var membership = await _repos.GroupMembershipRepo.FindAsync(x => x.GroupId == groupId && x.UserId == userId);
        return membership != null;
    }

    public async Task<bool> TransferGroupOwnershipAsync(Guid groupId, Guid newOwnerUserId)
    {
        var group = await _repos.GroupRepo.FindAsync(x => x.Id == groupId);
        if (group == null)
            return false;
        group.OwnerUserId = newOwnerUserId;
        await _repos.GroupRepo.UpdateAsync(x => x.Id == groupId, group);
        // Ensure membership: set old owner IsGroupOwner=false, new owner IsGroupOwner=true
        var memberships = await _repos.GroupMembershipRepo.FindAllAsync(x => x.GroupId == groupId);
        foreach (var membership in memberships)
        {
            if (membership.UserId == newOwnerUserId)
                membership.IsGroupOwner = true;
            else if (membership.IsGroupOwner)
                membership.IsGroupOwner = false;
            await _repos.GroupMembershipRepo.UpdateAsync(x => x.Id == membership.Id, membership);
        }

        // If new owner is not a member, add as owner
        if (!memberships.Any(m => m.UserId == newOwnerUserId))
        {
            var newOwnerMembership = new GroupMembership
            {
                Id = Guid.NewGuid(),
                GroupId = groupId,
                UserId = newOwnerUserId,
                IsGroupOwner = true
            };
            await _repos.GroupMembershipRepo.AddAsync(newOwnerMembership);
        }

        return true;
    }
}