using Genspire.Application.Modules.Identity.Groups.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Identity.Groups.Operations;
#region GroupType DTOs and Operations
public class GroupTypeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class CreateGroupTypeRequestDto
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class GetGroupTypeRequestDto
{
    public Guid Id { get; set; }
}

public class GetGroupTypeByNameRequestDto
{
    public string Name { get; set; } = default!;
}

public class ListGroupTypesRequestDto
{
}

public class UpdateGroupTypeRequestDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
}

public class DeleteGroupTypeRequestDto
{
    public Guid Id { get; set; }
}

public class GroupTypeResponseDto
{
    public GroupTypeDto? GroupType { get; set; }

    public GroupTypeResponseDto()
    {
    }

    public GroupTypeResponseDto(GroupTypeDto? groupType) => GroupType = groupType;
}

public class GroupTypesResponseDto
{
    public List<GroupTypeDto> GroupTypes { get; set; } = new();

    public GroupTypesResponseDto()
    {
    }

    public GroupTypesResponseDto(List<GroupTypeDto> groupTypes) => GroupTypes = groupTypes;
}

public class DeleteGroupTypeResponseDto
{
    public bool Success { get; set; }

    public DeleteGroupTypeResponseDto()
    {
    }

    public DeleteGroupTypeResponseDto(bool success) => Success = success;
}

public static class GroupTypeMapper
{
    public static GroupTypeDto ToDto(GroupType entity) => new GroupTypeDto
    {
        Id = entity.Id,
        Name = entity.Name,
        Description = entity.Description
    };
}

[OperationGroup("Groups")]
[OperationRoute("group/type/create")]
public sealed class CreateGroupTypeOperation : OperationBase<CreateGroupTypeRequestDto, GroupTypeResponseDto>
{
    private readonly IRepository<GroupType> _repo;
    public CreateGroupTypeOperation(IRepository<GroupType> repo) => _repo = repo;
    protected override async Task<GroupTypeResponseDto> HandleAsync(CreateGroupTypeRequestDto request)
    {
        var entity = new GroupType
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description
        };
        await _repo.AddAsync(entity);
        return new GroupTypeResponseDto(GroupTypeMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/type/get")]
public sealed class GetGroupTypeOperation : OperationBase<GetGroupTypeRequestDto, GroupTypeResponseDto>
{
    private readonly IRepository<GroupType> _repo;
    public GetGroupTypeOperation(IRepository<GroupType> repo) => _repo = repo;
    protected override async Task<GroupTypeResponseDto> HandleAsync(GetGroupTypeRequestDto request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        return new GroupTypeResponseDto(entity is null ? null : GroupTypeMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/type/get/by-name")]
public sealed class GetGroupTypeByNameOperation : OperationBase<GetGroupTypeByNameRequestDto, GroupTypeResponseDto>
{
    private readonly IRepository<GroupType> _repo;
    public GetGroupTypeByNameOperation(IRepository<GroupType> repo) => _repo = repo;
    protected override async Task<GroupTypeResponseDto> HandleAsync(GetGroupTypeByNameRequestDto request)
    {
        // Case-insensitive comparison is usually preferred
        var entity = await _repo.FindAsync(x => x.Name.ToLower() == request.Name.ToLower());
        return new GroupTypeResponseDto(entity is null ? null : GroupTypeMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/type/list")]
public sealed class ListGroupTypesOperation : OperationBase<ListGroupTypesRequestDto, GroupTypesResponseDto>
{
    private readonly IRepository<GroupType> _repo;
    public ListGroupTypesOperation(IRepository<GroupType> repo) => _repo = repo;
    protected override async Task<GroupTypesResponseDto> HandleAsync(ListGroupTypesRequestDto request)
    {
        var list = (await _repo.GetAllAsync()).Select(GroupTypeMapper.ToDto).ToList();
        return new GroupTypesResponseDto(list);
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/type/update")]
public sealed class UpdateGroupTypeOperation : OperationBase<UpdateGroupTypeRequestDto, GroupTypeResponseDto>
{
    private readonly IRepository<GroupType> _repo;
    public UpdateGroupTypeOperation(IRepository<GroupType> repo) => _repo = repo;
    protected override async Task<GroupTypeResponseDto> HandleAsync(UpdateGroupTypeRequestDto request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        if (entity == null)
            return new GroupTypeResponseDto(null);
        if (request.Name != null)
            entity.Name = request.Name;
        if (request.Description != null)
            entity.Description = request.Description;
        await _repo.UpdateAsync(x => x.Id == request.Id, entity);
        return new GroupTypeResponseDto(GroupTypeMapper.ToDto(entity));
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/type/delete")]
public sealed class DeleteGroupTypeOperation : OperationBase<DeleteGroupTypeRequestDto, DeleteGroupTypeResponseDto>
{
    private readonly IRepository<GroupType> _repo;
    public DeleteGroupTypeOperation(IRepository<GroupType> repo) => _repo = repo;
    protected override async Task<DeleteGroupTypeResponseDto> HandleAsync(DeleteGroupTypeRequestDto request)
    {
        await _repo.DeleteAsync(x => x.Id == request.Id);
        return new DeleteGroupTypeResponseDto(true);
    }
}
#endregion
