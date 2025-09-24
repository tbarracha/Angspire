using Identity.Groups.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Identity.Groups.Operations;

#region GroupRole DTOs and Operations
public class GroupRoleDto
{
    public Guid Id { get; set; }
    public Guid? GroupId { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class CreateGroupRoleRequestDto
{
    public Guid? GroupId { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class GetGroupRoleRequestDto
{
    public Guid Id { get; set; }
}

public class ListGroupRolesRequestDto
{
    public Guid? GroupId { get; set; }
}

public class UpdateGroupRoleRequestDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
}

public class DeleteGroupRoleRequestDto
{
    public Guid Id { get; set; }
}

public class GroupRoleResponseDto
{
    public GroupRoleDto? Role { get; set; }

    public GroupRoleResponseDto()
    {
    }

    public GroupRoleResponseDto(GroupRoleDto? role) => Role = role;
}

public class GroupRolesResponseDto
{
    public List<GroupRoleDto> Roles { get; set; } = new();

    public GroupRolesResponseDto()
    {
    }

    public GroupRolesResponseDto(List<GroupRoleDto> roles) => Roles = roles;
}

public class DeleteGroupRoleResponseDto
{
    public bool Success { get; set; }

    public DeleteGroupRoleResponseDto()
    {
    }

    public DeleteGroupRoleResponseDto(bool success) => Success = success;
}

public static class GroupRoleMapper
{
    public static GroupRoleDto ToDto(GroupRole entity) => new GroupRoleDto
    {
        Id = entity.Id,
        GroupId = entity.GroupId,
        Name = entity.Name,
        Description = entity.Description
    };
}

[OperationGroup("Groups")]
[OperationRoute("group/role/create")]
public sealed class CreateGroupRoleOperation : OperationBase<CreateGroupRoleRequestDto, GroupRoleResponseDto>
{
    private readonly IRepository<GroupRole> _repo;
    public CreateGroupRoleOperation(IRepository<GroupRole> repo) => _repo = repo;
    protected override async Task<GroupRoleResponseDto> HandleAsync(CreateGroupRoleRequestDto request)
    {
        var entity = new GroupRole
        {
            Id = Guid.NewGuid(),
            GroupId = request.GroupId,
            Name = request.Name,
            Description = request.Description
        };
        await _repo.AddAsync(entity);
        return new GroupRoleResponseDto(GroupRoleMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/role/get")]
public sealed class GetGroupRoleOperation : OperationBase<GetGroupRoleRequestDto, GroupRoleResponseDto>
{
    private readonly IRepository<GroupRole> _repo;
    public GetGroupRoleOperation(IRepository<GroupRole> repo) => _repo = repo;
    protected override async Task<GroupRoleResponseDto> HandleAsync(GetGroupRoleRequestDto request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        return new GroupRoleResponseDto(entity is null ? null : GroupRoleMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/role/list")]
public sealed class ListGroupRolesOperation : OperationBase<ListGroupRolesRequestDto, GroupRolesResponseDto>
{
    private readonly IRepository<GroupRole> _repo;
    public ListGroupRolesOperation(IRepository<GroupRole> repo) => _repo = repo;
    protected override async Task<GroupRolesResponseDto> HandleAsync(ListGroupRolesRequestDto request)
    {
        var list = await _repo.GetAllAsync();
        if (request.GroupId.HasValue)
            list = list.Where(x => x.GroupId == request.GroupId.Value);
        return new GroupRolesResponseDto(list.Select(GroupRoleMapper.ToDto).ToList());
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/role/update")]
public sealed class UpdateGroupRoleOperation : OperationBase<UpdateGroupRoleRequestDto, GroupRoleResponseDto>
{
    private readonly IRepository<GroupRole> _repo;
    public UpdateGroupRoleOperation(IRepository<GroupRole> repo) => _repo = repo;
    protected override async Task<GroupRoleResponseDto> HandleAsync(UpdateGroupRoleRequestDto request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        if (entity == null)
            return new GroupRoleResponseDto(null);
        if (request.Name != null)
            entity.Name = request.Name;
        if (request.Description != null)
            entity.Description = request.Description;
        await _repo.UpdateAsync(x => x.Id == request.Id, entity);
        return new GroupRoleResponseDto(GroupRoleMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/role/delete")]
public sealed class DeleteGroupRoleOperation : OperationBase<DeleteGroupRoleRequestDto, DeleteGroupRoleResponseDto>
{
    private readonly IRepository<GroupRole> _repo;
    public DeleteGroupRoleOperation(IRepository<GroupRole> repo) => _repo = repo;
    protected override async Task<DeleteGroupRoleResponseDto> HandleAsync(DeleteGroupRoleRequestDto request)
    {
        await _repo.DeleteAsync(x => x.Id == request.Id);
        return new DeleteGroupRoleResponseDto(true);
    }
}
#endregion
