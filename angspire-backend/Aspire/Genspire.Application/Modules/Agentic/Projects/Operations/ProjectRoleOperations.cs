using Genspire.Application.Modules.Agentic.Projects.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Agentic.Projects.Operations;
#region ProjectRole DTOs and Operations
public class ProjectRoleDto
{
    public Guid Id { get; set; }
    public Guid? ProjectId { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class CreateProjectRoleRequest
{
    public Guid? ProjectId { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class GetProjectRoleRequest
{
    public Guid Id { get; set; }
}

public class ListProjectRolesRequest
{
    public Guid? ProjectId { get; set; }
}

public class UpdateProjectRoleRequest
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
}

public class DeleteProjectRoleRequest
{
    public Guid Id { get; set; }
}

public class ProjectRoleResponse
{
    public ProjectRoleDto? Role { get; set; }

    public ProjectRoleResponse()
    {
    }

    public ProjectRoleResponse(ProjectRoleDto? role) => Role = role;
}

public class ProjectRolesResponse
{
    public List<ProjectRoleDto> Roles { get; set; } = new();

    public ProjectRolesResponse()
    {
    }

    public ProjectRolesResponse(List<ProjectRoleDto> roles) => Roles = roles;
}

public class DeleteProjectRoleResponse
{
    public bool Success { get; set; }

    public DeleteProjectRoleResponse()
    {
    }

    public DeleteProjectRoleResponse(bool success) => Success = success;
}

public static class ProjectRoleMapper
{
    public static ProjectRoleDto ToDto(ProjectRole entity) => new ProjectRoleDto
    {
        Id = entity.Id,
        ProjectId = entity.ProjectId,
        Name = entity.Name,
        Description = entity.Description
    };
}

[OperationGroup("Projects")]
[OperationRoute("project/role/create")]
public sealed class CreateProjectRoleOperation : OperationBase<CreateProjectRoleRequest, ProjectRoleResponse>
{
    private readonly IRepository<ProjectRole> _repo;
    public CreateProjectRoleOperation(IRepository<ProjectRole> repo) => _repo = repo;
    protected override async Task<ProjectRoleResponse> HandleAsync(CreateProjectRoleRequest request)
    {
        var entity = new ProjectRole
        {
            Id = Guid.NewGuid(),
            ProjectId = request.ProjectId,
            Name = request.Name,
            Description = request.Description
        };
        await _repo.AddAsync(entity);
        return new ProjectRoleResponse(ProjectRoleMapper.ToDto(entity));
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/role/get")]
public sealed class GetProjectRoleOperation : OperationBase<GetProjectRoleRequest, ProjectRoleResponse>
{
    private readonly IRepository<ProjectRole> _repo;
    public GetProjectRoleOperation(IRepository<ProjectRole> repo) => _repo = repo;
    protected override async Task<ProjectRoleResponse> HandleAsync(GetProjectRoleRequest request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        return new ProjectRoleResponse(entity is null ? null : ProjectRoleMapper.ToDto(entity));
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/role/list")]
public sealed class ListProjectRolesOperation : OperationBase<ListProjectRolesRequest, ProjectRolesResponse>
{
    private readonly IRepository<ProjectRole> _repo;
    public ListProjectRolesOperation(IRepository<ProjectRole> repo) => _repo = repo;
    protected override async Task<ProjectRolesResponse> HandleAsync(ListProjectRolesRequest request)
    {
        var list = await _repo.GetAllAsync();
        if (request.ProjectId.HasValue)
            list = list.Where(x => x.ProjectId == request.ProjectId.Value);
        return new ProjectRolesResponse(list.Select(ProjectRoleMapper.ToDto).ToList());
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/role/update")]
public sealed class UpdateProjectRoleOperation : OperationBase<UpdateProjectRoleRequest, ProjectRoleResponse>
{
    private readonly IRepository<ProjectRole> _repo;
    public UpdateProjectRoleOperation(IRepository<ProjectRole> repo) => _repo = repo;
    protected override async Task<ProjectRoleResponse> HandleAsync(UpdateProjectRoleRequest request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        if (entity == null)
            return new ProjectRoleResponse(null);
        if (request.Name != null)
            entity.Name = request.Name;
        if (request.Description != null)
            entity.Description = request.Description;
        await _repo.UpdateAsync(x => x.Id == request.Id, entity);
        return new ProjectRoleResponse(ProjectRoleMapper.ToDto(entity));
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/role/delete")]
public sealed class DeleteProjectRoleOperation : OperationBase<DeleteProjectRoleRequest, DeleteProjectRoleResponse>
{
    private readonly IRepository<ProjectRole> _repo;
    public DeleteProjectRoleOperation(IRepository<ProjectRole> repo) => _repo = repo;
    protected override async Task<DeleteProjectRoleResponse> HandleAsync(DeleteProjectRoleRequest request)
    {
        await _repo.DeleteAsync(x => x.Id == request.Id);
        return new DeleteProjectRoleResponse(true);
    }
}
#endregion
