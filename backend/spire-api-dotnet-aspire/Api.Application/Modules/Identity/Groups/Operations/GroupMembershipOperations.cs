using Genspire.Application.Modules.Identity.Groups.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Identity.Groups.Operations;
#region DTOs
public sealed class AddGroupMemberRequestDto
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public Guid? RoleId { get; set; }
    public string? State { get; set; }
    public bool IsGroupOwner { get; set; } = false;
}

public sealed class RemoveGroupMemberRequestDto
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
}

public sealed class AddMemberRoleRequestDto
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
}

public sealed class RemoveMemberRoleRequestDto
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
}

public sealed class ListGroupMembersRequestDto
{
    // Filter by group
    public Guid? GroupId { get; set; }
    public string? GroupName { get; set; }
    // Filter by role (either by id or by name)
    public Guid? RoleId { get; set; }
    public string? RoleName { get; set; }
    // Optional: filter owners
    public bool? IsGroupOwner { get; set; }
}

public sealed class GroupMemberDto
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public Guid? RoleId { get; set; }
    public string? RoleName { get; set; }
    public string? State { get; set; }
    public bool IsGroupOwner { get; set; }
}

public sealed class GroupMembersResponseDto
{
    public List<GroupMemberDto> Members { get; set; } = new();

    public GroupMembersResponseDto()
    {
    }

    public GroupMembersResponseDto(List<GroupMemberDto> members) => Members = members;
}

internal static class GroupMemberMapper
{
    public static GroupMemberDto ToDto(GroupMembership m, string? roleName = null) => new()
    {
        GroupId = m.GroupId,
        UserId = m.UserId,
        RoleId = m.RoleId,
        RoleName = roleName,
        State = m.State,
        IsGroupOwner = m.IsGroupOwner
    };
}

#endregion
#region Operations: Add / Remove Member
[OperationGroup("Groups")]
[OperationRoute("group/member/add")]
public sealed class AddGroupMemberOperation : OperationBase<AddGroupMemberRequestDto, OperationSuccessResponseDto>
{
    private readonly IRepository<GroupMembership> _membershipRepo;
    private readonly IRepository<Group> _groupRepo;
    private readonly IRepository<GroupRole> _roleRepo;
    public AddGroupMemberOperation(IRepository<GroupMembership> membershipRepo, IRepository<Group> groupRepo, IRepository<GroupRole> roleRepo)
    {
        _membershipRepo = membershipRepo;
        _groupRepo = groupRepo;
        _roleRepo = roleRepo;
    }

    protected override async Task<OperationSuccessResponseDto> HandleAsync(AddGroupMemberRequestDto request)
    {
        var group = await _groupRepo.FindAsync(g => g.Id == request.GroupId);
        if (group is null)
            return new OperationSuccessResponseDto(false);
        var existing = await _membershipRepo.FindAsync(m => m.GroupId == request.GroupId && m.UserId == request.UserId);
        if (existing is not null)
            return new OperationSuccessResponseDto(true);
        // If no RoleId provided or invalid/out-of-scope, fall back to default Member role
        var roleId = await EnsureValidRoleOrDefaultAsync(request.GroupId, request.RoleId);
        var entity = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = request.GroupId,
            UserId = request.UserId,
            RoleId = roleId,
            State = request.State,
            IsGroupOwner = request.IsGroupOwner
        };
        await _membershipRepo.AddAsync(entity);
        return new OperationSuccessResponseDto(true);
    }

    private async Task<Guid> EnsureValidRoleOrDefaultAsync(Guid groupId, Guid? maybeRoleId)
    {
        if (maybeRoleId.HasValue)
        {
            var role = await _roleRepo.FindAsync(r => r.Id == maybeRoleId.Value);
            if (role is not null && (!role.GroupId.HasValue || role.GroupId.Value == groupId))
                return role.Id;
        }

        // Fallback to Default Member
        var member = await _roleRepo.FindAsync(r => r.Id == DefaultGroupRoles.Member.Id) ?? await _roleRepo.AddAsync(new GroupRole { Id = DefaultGroupRoles.Member.Id, GroupId = null, Name = DefaultGroupRoles.Member.Name, Description = DefaultGroupRoles.Member.Description });
        return member.Id;
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/member/remove")]
public sealed class RemoveGroupMemberOperation : OperationBase<RemoveGroupMemberRequestDto, OperationSuccessResponseDto>
{
    private readonly IRepository<GroupMembership> _membershipRepo;
    public RemoveGroupMemberOperation(IRepository<GroupMembership> membershipRepo) => _membershipRepo = membershipRepo;
    protected override async Task<OperationSuccessResponseDto> HandleAsync(RemoveGroupMemberRequestDto request)
    {
        var deleted = await _membershipRepo.DeleteAsync(m => m.GroupId == request.GroupId && m.UserId == request.UserId);
        return new OperationSuccessResponseDto(deleted is not null);
    }
}

#endregion
#region Operations: Add / Revoke Member Role (always keep a role)
[OperationGroup("Groups")]
[OperationRoute("group/member/role/set")]
public sealed class AddMemberRoleOperation : OperationBase<AddMemberRoleRequestDto, OperationSuccessResponseDto>
{
    private readonly IRepository<GroupMembership> _membershipRepo;
    private readonly IRepository<GroupRole> _roleRepo;
    public AddMemberRoleOperation(IRepository<GroupMembership> membershipRepo, IRepository<GroupRole> roleRepo)
    {
        _membershipRepo = membershipRepo;
        _roleRepo = roleRepo;
    }

    protected override async Task<OperationSuccessResponseDto> HandleAsync(AddMemberRoleRequestDto request)
    {
        var membership = await _membershipRepo.FindAsync(m => m.GroupId == request.GroupId && m.UserId == request.UserId);
        if (membership is null)
            return new OperationSuccessResponseDto(false);
        // Validate requested role; if invalid or out of scope, fallback to default Member
        var targetRoleId = await EnsureValidRoleOrDefaultAsync(request.GroupId, request.RoleId);
        membership.RoleId = targetRoleId;
        await _membershipRepo.UpdateAsync(m => m.Id == membership.Id, membership);
        return new OperationSuccessResponseDto(true);
    }

    private async Task<Guid> EnsureValidRoleOrDefaultAsync(Guid groupId, Guid roleId)
    {
        var role = await _roleRepo.FindAsync(r => r.Id == roleId);
        if (role is not null && (!role.GroupId.HasValue || role.GroupId.Value == groupId))
            return role.Id;
        // Fallback to deterministic default Member if invalid/out-of-scope
        var member = await _roleRepo.FindAsync(r => r.Id == DefaultGroupRoles.Member.Id) ?? await _roleRepo.AddAsync(new GroupRole { Id = DefaultGroupRoles.Member.Id, GroupId = null, Name = DefaultGroupRoles.Member.Name, Description = DefaultGroupRoles.Member.Description });
        return member.Id;
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/member/role/revoke")]
public sealed class RemoveMemberRoleOperation : OperationBase<RemoveMemberRoleRequestDto, OperationSuccessResponseDto>
{
    private readonly IRepository<GroupMembership> _membershipRepo;
    private readonly IRepository<GroupRole> _roleRepo;
    public RemoveMemberRoleOperation(IRepository<GroupMembership> membershipRepo, IRepository<GroupRole> roleRepo)
    {
        _membershipRepo = membershipRepo;
        _roleRepo = roleRepo;
    }

    protected override async Task<OperationSuccessResponseDto> HandleAsync(RemoveMemberRoleRequestDto request)
    {
        var membership = await _membershipRepo.FindAsync(m => m.GroupId == request.GroupId && m.UserId == request.UserId);
        if (membership is null)
            return new OperationSuccessResponseDto(false);
        // On revoke, assign the default Member role (never leave it null)
        var memberRole = await _roleRepo.FindAsync(r => r.Id == DefaultGroupRoles.Member.Id) ?? await _roleRepo.AddAsync(new GroupRole { Id = DefaultGroupRoles.Member.Id, GroupId = null, Name = DefaultGroupRoles.Member.Name, Description = DefaultGroupRoles.Member.Description });
        membership.RoleId = memberRole.Id;
        await _membershipRepo.UpdateAsync(m => m.Id == membership.Id, membership);
        return new OperationSuccessResponseDto(true);
    }
}

#endregion
#region Operation: List Members (generalized filter: by id, name, or role)
[OperationGroup("Groups")]
[OperationRoute("group/member/list")]
public sealed class ListGroupMembersOperation : OperationBase<ListGroupMembersRequestDto, GroupMembersResponseDto>
{
    private readonly IRepository<Group> _groupRepo;
    private readonly IRepository<GroupMembership> _membershipRepo;
    private readonly IRepository<GroupRole> _roleRepo;
    public ListGroupMembersOperation(IRepository<Group> groupRepo, IRepository<GroupMembership> membershipRepo, IRepository<GroupRole> roleRepo)
    {
        _groupRepo = groupRepo;
        _membershipRepo = membershipRepo;
        _roleRepo = roleRepo;
    }

    protected override async Task<GroupMembersResponseDto> HandleAsync(ListGroupMembersRequestDto request)
    {
        // 1) Resolve target group ids (by GroupId or GroupName)
        HashSet<Guid>? targetGroupIds = null;
        if (request.GroupId.HasValue)
        {
            targetGroupIds = new HashSet<Guid>
            {
                request.GroupId.Value
            };
        }
        else if (!string.IsNullOrWhiteSpace(request.GroupName))
        {
            // Exact match (keep consistent with previous behavior). Add a normalized field if you need case-insensitivity.
            var g = await _groupRepo.FindAsync(x => x.Name == request.GroupName);
            if (g is null)
                return new GroupMembersResponseDto(new());
            targetGroupIds = new HashSet<Guid>
            {
                g.Id
            };
        }

        // 2) Resolve target role ids (by RoleId or RoleName)
        HashSet<Guid>? targetRoleIds = null;
        if (request.RoleId.HasValue)
        {
            targetRoleIds = new HashSet<Guid>
            {
                request.RoleId.Value
            };
        }
        else if (!string.IsNullOrWhiteSpace(request.RoleName))
        {
            // Match global roles or roles scoped to the target group if provided
            if (targetGroupIds is not null)
            {
                var gid = targetGroupIds.First();
                var roles = await _roleRepo.FindAllAsync(r => r.Name == request.RoleName && (r.GroupId == null || r.GroupId == gid));
                targetRoleIds = roles.Select(r => r.Id).ToHashSet();
            }
            else
            {
                // No group filter -> allow global roles with that name
                var roles = await _roleRepo.FindAllAsync(r => r.Name == request.RoleName);
                targetRoleIds = roles.Select(r => r.Id).ToHashSet();
            }
        }

        // 3) Load memberships and apply filters
        var memberships = await _membershipRepo.GetAllAsync();
        if (targetGroupIds is not null)
            memberships = memberships.Where(m => targetGroupIds.Contains(m.GroupId));
        if (request.IsGroupOwner.HasValue)
            memberships = memberships.Where(m => m.IsGroupOwner == request.IsGroupOwner.Value);
        if (targetRoleIds is not null)
            memberships = memberships.Where(m => m.RoleId.HasValue && targetRoleIds.Contains(m.RoleId.Value));
        var list = memberships.ToList();
        if (list.Count == 0)
            return new GroupMembersResponseDto(new());
        // 4) Enrich with role names
        var roleIds = list.Where(m => m.RoleId.HasValue).Select(m => m.RoleId!.Value).ToHashSet();
        var rolesLookup = roleIds.Count == 0 ? new Dictionary<Guid, string>() : (await _roleRepo.FindAllAsync(r => roleIds.Contains(r.Id))).ToDictionary(r => r.Id, r => r.Name);
        var dtos = list.Select(m => GroupMemberMapper.ToDto(m, m.RoleId.HasValue && rolesLookup.TryGetValue(m.RoleId.Value, out var rn) ? rn : null)).ToList();
        return new GroupMembersResponseDto(dtos);
    }
}
#endregion
