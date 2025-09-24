using Identity.Groups.Models;
using Identity.Groups.Services;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Identity.Groups.Operations;

#region Group DTOs and Operations
public class GroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid GroupTypeId { get; set; }
    public Guid? OwnerUserId { get; set; }
    public string? Description { get; set; }
    public Guid? ParentGroupId { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class CreateGroupRequestDto
{
    public string Name { get; set; } = default!;
    public Guid GroupTypeId { get; set; }
    public Guid? OwnerUserId { get; set; }
    public string? Description { get; set; }
    public Guid? ParentGroupId { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class GetGroupRequestDto
{
    public Guid Id { get; set; }
}

public class ListGroupsRequestDto
{
    public Guid? UserId { get; set; }
    // Optional filters
    public Guid? GroupTypeId { get; set; }
    public Guid? RoleId { get; set; }
    public string? RoleName { get; set; }
    public bool? IsGroupOwner { get; set; }
}

public class UpdateGroupRequestDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public Guid? GroupTypeId { get; set; }
    public Guid? OwnerUserId { get; set; }
    public string? Description { get; set; }
    public Guid? ParentGroupId { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class DeleteGroupRequestDto
{
    public Guid Id { get; set; }
}

public class GroupResponseDto
{
    public GroupDto? Group { get; set; }

    public GroupResponseDto()
    {
    }

    public GroupResponseDto(GroupDto? group) => Group = group;
}

public class GroupsResponseDto
{
    public List<GroupDto> Groups { get; set; } = new();

    public GroupsResponseDto()
    {
    }

    public GroupsResponseDto(List<GroupDto> groups) => Groups = groups;
}

public class DeleteGroupResponseDto
{
    public bool Success { get; set; }

    public DeleteGroupResponseDto()
    {
    }

    public DeleteGroupResponseDto(bool success) => Success = success;
}

public static class GroupMapper
{
    public static GroupDto ToDto(Group entity) => new GroupDto
    {
        Id = entity.Id,
        Name = entity.Name,
        GroupTypeId = entity.GroupTypeId,
        OwnerUserId = entity.OwnerUserId,
        Description = entity.Description,
        ParentGroupId = entity.ParentGroupId,
        Metadata = entity.Metadata
    };
}

[OperationGroup("Groups")]
[OperationRoute("group/create")]
public sealed class CreateGroupOperation : OperationBase<CreateGroupRequestDto, GroupResponseDto>
{
    private readonly IRepository<Group> _repo;
    public CreateGroupOperation(IRepository<Group> repo) => _repo = repo;
    protected override async Task<GroupResponseDto> HandleAsync(CreateGroupRequestDto request)
    {
        var entity = new Group
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            GroupTypeId = request.GroupTypeId,
            OwnerUserId = request.OwnerUserId,
            Description = request.Description,
            ParentGroupId = request.ParentGroupId,
            Metadata = request.Metadata
        };
        await _repo.AddAsync(entity);
        return new GroupResponseDto(GroupMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/get")]
public sealed class GetGroupOperation : OperationBase<GetGroupRequestDto, GroupResponseDto>
{
    private readonly IRepository<Group> _repo;
    public GetGroupOperation(IRepository<Group> repo) => _repo = repo;
    protected override async Task<GroupResponseDto> HandleAsync(GetGroupRequestDto request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        return new GroupResponseDto(entity is null ? null : GroupMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/list")]
public sealed class ListGroupsByUserOperation : OperationBase<ListGroupsRequestDto, GroupsResponseDto>
{
    private readonly IRepository<Group> _groupRepo;
    private readonly IRepository<GroupMembership> _membershipRepo;
    private readonly IRepository<GroupRole> _roleRepo;
    private readonly GroupService _groupService;

    public ListGroupsByUserOperation(IRepository<Group> groupRepo, IRepository<GroupMembership> membershipRepo, IRepository<GroupRole> roleRepo, GroupService groupService)
    {
        _groupRepo = groupRepo;
        _membershipRepo = membershipRepo;
        _roleRepo = roleRepo;
        _groupService = groupService;
    }

    protected override async Task<GroupsResponseDto> HandleAsync(ListGroupsRequestDto request)
    {
        // 1) Fetch memberships for the user
        var memberships = await _membershipRepo.FindAllAsync(m => m.UserId == request.UserId);
        // Optional: filter by owner flag
        if (request.IsGroupOwner.HasValue)
            memberships = memberships.Where(m => m.IsGroupOwner == request.IsGroupOwner.Value);
        // Optional: filter by role id/name
        if (request.RoleId.HasValue)
        {
            var rid = request.RoleId.Value;
            memberships = memberships.Where(m => m.RoleId.HasValue && m.RoleId.Value == rid);
        }
        else if (!string.IsNullOrWhiteSpace(request.RoleName))
        {
            // Resolve all roles with that name (global or group-scoped)
            var roles = await _roleRepo.FindAllAsync(r => r.Name == request.RoleName);
            var roleIds = roles.Select(r => r.Id).ToHashSet();
            memberships = memberships.Where(m => m.RoleId.HasValue && roleIds.Contains(m.RoleId.Value));
        }

        var membershipList = memberships.ToList();
        if (membershipList.Count == 0)
        {
            var defaultGroup = await _groupService.CreateTeamGroupForUserAsync(request.UserId!.Value);
            return new GroupsResponseDto(new() { GroupMapper.ToDto(defaultGroup) });
        }
        // 2) Gather group ids from memberships
        var groupIds = membershipList.Select(m => m.GroupId).ToHashSet();
        // 3) Fetch groups and apply optional GroupType filter
        var groups = await _groupRepo.FindAllAsync(g => groupIds.Contains(g.Id));
        if (request.GroupTypeId.HasValue)
            groups = groups.Where(g => g.GroupTypeId == request.GroupTypeId.Value);
        var result = groups.Select(GroupMapper.ToDto).ToList();
        return new GroupsResponseDto(result);
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/update")]
public sealed class UpdateGroupOperation : OperationBase<UpdateGroupRequestDto, GroupResponseDto>
{
    private readonly IRepository<Group> _repo;
    public UpdateGroupOperation(IRepository<Group> repo) => _repo = repo;
    protected override async Task<GroupResponseDto> HandleAsync(UpdateGroupRequestDto request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        if (entity == null)
            return new GroupResponseDto(null);
        if (request.Name != null)
            entity.Name = request.Name;
        if (request.GroupTypeId.HasValue)
            entity.GroupTypeId = request.GroupTypeId.Value;
        if (request.OwnerUserId.HasValue)
            entity.OwnerUserId = request.OwnerUserId.Value;
        if (request.Description != null)
            entity.Description = request.Description;
        if (request.ParentGroupId.HasValue)
            entity.ParentGroupId = request.ParentGroupId.Value;
        if (request.Metadata != null)
            entity.Metadata = request.Metadata;
        await _repo.UpdateAsync(x => x.Id == request.Id, entity);
        return new GroupResponseDto(GroupMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/delete")]
public sealed class DeleteGroupOperation : OperationBase<DeleteGroupRequestDto, DeleteGroupResponseDto>
{
    private readonly IRepository<Group> _repo;
    public DeleteGroupOperation(IRepository<Group> repo) => _repo = repo;
    protected override async Task<DeleteGroupResponseDto> HandleAsync(DeleteGroupRequestDto request)
    {
        await _repo.DeleteAsync(x => x.Id == request.Id);
        return new DeleteGroupResponseDto(true);
    }
}
#endregion
