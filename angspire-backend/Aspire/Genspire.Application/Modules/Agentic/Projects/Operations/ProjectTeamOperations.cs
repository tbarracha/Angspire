using Genspire.Application.Modules.Agentic.Projects.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Agentic.Projects.Operations;
#region ProjectTeam DTOs and Operations
public class ProjectTeamDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid ProjectId { get; set; }
    public Guid GroupId { get; set; }
    public string? Description { get; set; }
}

public class CreateProjectTeamRequest
{
    public string Name { get; set; } = default!;
    public Guid ProjectId { get; set; }
    public Guid GroupId { get; set; }
    public string? Description { get; set; }
}

public class GetProjectTeamRequest
{
    public Guid Id { get; set; }
}

public class ListProjectTeamsRequest
{
    public Guid? ProjectId { get; set; }
    public Guid? GroupId { get; set; }
}

public class UpdateProjectTeamRequest
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? GroupId { get; set; }
    public string? Description { get; set; }
}

public class DeleteProjectTeamRequest
{
    public Guid Id { get; set; }
}

public class ProjectTeamResponse
{
    public ProjectTeamDto? ProjectTeam { get; set; }

    public ProjectTeamResponse()
    {
    }

    public ProjectTeamResponse(ProjectTeamDto? projectTeam) => ProjectTeam = projectTeam;
}

public class ProjectTeamsResponse
{
    public List<ProjectTeamDto> ProjectTeams { get; set; } = new();

    public ProjectTeamsResponse()
    {
    }

    public ProjectTeamsResponse(List<ProjectTeamDto> teams) => ProjectTeams = teams;
}

public class DeleteProjectTeamResponse
{
    public bool Success { get; set; }

    public DeleteProjectTeamResponse()
    {
    }

    public DeleteProjectTeamResponse(bool success) => Success = success;
}

public static class ProjectTeamMapper
{
    public static ProjectTeamDto ToDto(ProjectTeam entity) => new ProjectTeamDto
    {
        Id = entity.Id,
        Name = entity.Name,
        ProjectId = entity.ProjectId,
        GroupId = entity.GroupId,
        Description = entity.Description
    };
}

[OperationGroup("Projects")]
[OperationRoute("project/team/create")]
public sealed class CreateProjectTeamOperation : OperationBase<CreateProjectTeamRequest, ProjectTeamResponse>
{
    private readonly IRepository<ProjectTeam> _repo;
    public CreateProjectTeamOperation(IRepository<ProjectTeam> repo) => _repo = repo;
    protected override async Task<ProjectTeamResponse> HandleAsync(CreateProjectTeamRequest request)
    {
        var entity = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            ProjectId = request.ProjectId,
            GroupId = request.GroupId,
            Description = request.Description
        };
        await _repo.AddAsync(entity);
        return new ProjectTeamResponse(ProjectTeamMapper.ToDto(entity));
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/team/get")]
public sealed class GetProjectTeamOperation : OperationBase<GetProjectTeamRequest, ProjectTeamResponse>
{
    private readonly IRepository<ProjectTeam> _repo;
    public GetProjectTeamOperation(IRepository<ProjectTeam> repo) => _repo = repo;
    protected override async Task<ProjectTeamResponse> HandleAsync(GetProjectTeamRequest request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        return new ProjectTeamResponse(entity is null ? null : ProjectTeamMapper.ToDto(entity));
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/team/list")]
public sealed class ListProjectTeamsOperation : OperationBase<ListProjectTeamsRequest, ProjectTeamsResponse>
{
    private readonly IRepository<ProjectTeam> _repo;
    public ListProjectTeamsOperation(IRepository<ProjectTeam> repo) => _repo = repo;
    protected override async Task<ProjectTeamsResponse> HandleAsync(ListProjectTeamsRequest request)
    {
        var list = await _repo.GetAllAsync();
        if (request.ProjectId.HasValue)
            list = list.Where(x => x.ProjectId == request.ProjectId.Value);
        if (request.GroupId.HasValue)
            list = list.Where(x => x.GroupId == request.GroupId.Value);
        return new ProjectTeamsResponse(list.Select(ProjectTeamMapper.ToDto).ToList());
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/team/update")]
public sealed class UpdateProjectTeamOperation : OperationBase<UpdateProjectTeamRequest, ProjectTeamResponse>
{
    private readonly IRepository<ProjectTeam> _repo;
    public UpdateProjectTeamOperation(IRepository<ProjectTeam> repo) => _repo = repo;
    protected override async Task<ProjectTeamResponse> HandleAsync(UpdateProjectTeamRequest request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        if (entity == null)
            return new ProjectTeamResponse(null);
        if (request.Name != null)
            entity.Name = request.Name;
        if (request.ProjectId.HasValue)
            entity.ProjectId = request.ProjectId.Value;
        if (request.GroupId.HasValue)
            entity.GroupId = request.GroupId.Value;
        if (request.Description != null)
            entity.Description = request.Description;
        await _repo.UpdateAsync(x => x.Id == request.Id, entity);
        return new ProjectTeamResponse(ProjectTeamMapper.ToDto(entity));
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/team/delete")]
public sealed class DeleteProjectTeamOperation : OperationBase<DeleteProjectTeamRequest, DeleteProjectTeamResponse>
{
    private readonly IRepository<ProjectTeam> _repo;
    public DeleteProjectTeamOperation(IRepository<ProjectTeam> repo) => _repo = repo;
    protected override async Task<DeleteProjectTeamResponse> HandleAsync(DeleteProjectTeamRequest request)
    {
        await _repo.DeleteAsync(x => x.Id == request.Id);
        return new DeleteProjectTeamResponse(true);
    }
}
#endregion
