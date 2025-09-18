using Genspire.Application.Modules.Agentic.Projects.Domain.Models;
using Genspire.Application.Modules.Identity.Groups.Domain.Models; // GroupMembership for list gating
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Agentic.Projects.Operations;
#region Project DTOs and Operations (CRUD + list gated by group membership)
public class ProjectDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid GroupId { get; set; }
    public Guid? OwnerUserId { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class CreateProjectRequestDto
{
    public string Name { get; set; } = default!;
    public Guid GroupId { get; set; }
    public Guid? OwnerUserId { get; set; } // If provided, creator becomes Owner member
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class GetProjectRequestDto
{
    public Guid Id { get; set; }
}

// Group-specific list (single group): projects under GroupId, gated by the user's membership in that group.
public class ListProjectsByGroupRequestDto
{
    public Guid UserId { get; set; }
    public Guid GroupId { get; set; }
    // Optional membership-based filters within the group
    public Guid? RoleId { get; set; }
    public string? RoleName { get; set; }
    public bool? IsGroupOwner { get; set; }
}

public class UpdateProjectRequestDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public Guid? GroupId { get; set; }
    public Guid? OwnerUserId { get; set; } // If changed, ensure new owner has Owner role membership
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class DeleteProjectRequestDto
{
    public Guid Id { get; set; }
}

public class ProjectResponseDto
{
    public ProjectDto? Project { get; set; }

    public ProjectResponseDto()
    {
    }

    public ProjectResponseDto(ProjectDto? project) => Project = project;
}

public class ProjectsResponseDto
{
    public List<ProjectDto> Projects { get; set; } = new();

    public ProjectsResponseDto()
    {
    }

    public ProjectsResponseDto(List<ProjectDto> projects) => Projects = projects;
}

public class DeleteProjectResponseDto
{
    public bool Success { get; set; }

    public DeleteProjectResponseDto()
    {
    }

    public DeleteProjectResponseDto(bool success) => Success = success;
}

public static class ProjectMapper
{
    public static ProjectDto ToDto(Project entity) => new ProjectDto
    {
        Id = entity.Id,
        Name = entity.Name,
        GroupId = entity.GroupId,
        OwnerUserId = entity.OwnerUserId,
        Description = entity.Description,
        ImageUrl = entity.ImageUrl,
        Metadata = entity.Metadata
    };
}

[OperationGroup("Projects")]
[OperationRoute("project/create")]
public sealed class CreateProjectOperation : OperationBase<CreateProjectRequestDto, ProjectResponseDto>
{
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<ProjectMembership> _projectMemberRepo;
    private readonly IRepository<ProjectRole> _projectRoleRepo;
    public CreateProjectOperation(IRepository<Project> projectRepo, IRepository<ProjectMembership> projectMemberRepo, IRepository<ProjectRole> projectRoleRepo)
    {
        _projectRepo = projectRepo;
        _projectMemberRepo = projectMemberRepo;
        _projectRoleRepo = projectRoleRepo;
    }

    protected override async Task<ProjectResponseDto> HandleAsync(CreateProjectRequestDto request)
    {
        var entity = new Project
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            GroupId = request.GroupId,
            OwnerUserId = request.OwnerUserId,
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            Metadata = request.Metadata
        };
        await _projectRepo.AddAsync(entity);
        // If the caller supplied an OwnerUserId, ensure the user immediately becomes an Owner member of this project.
        if (request.OwnerUserId.HasValue)
        {
            var ownerRole = await EnsureDefaultProjectRoleAsync(DefaultProjectRoles.Owner);
            var existing = await _projectMemberRepo.FindAsync(m => m.ProjectId == entity.Id && m.UserId == request.OwnerUserId.Value);
            if (existing is null)
            {
                await _projectMemberRepo.AddAsync(new ProjectMembership { Id = Guid.NewGuid(), ProjectId = entity.Id, UserId = request.OwnerUserId.Value, RoleId = ownerRole.Id, State = "Active" });
            }
            else
            {
                // Upgrade membership to Owner if needed
                if (existing.RoleId != ownerRole.Id)
                {
                    existing.RoleId = ownerRole.Id;
                    await _projectMemberRepo.UpdateAsync(m => m.Id == existing.Id, existing);
                }
            }
        }

        return new ProjectResponseDto(ProjectMapper.ToDto(entity));
    }

    private async Task<ProjectRole> EnsureDefaultProjectRoleAsync(ProjectRole template)
    {
        var found = await _projectRoleRepo.FindAsync(r => r.Id == template.Id) ?? await _projectRoleRepo.FindAsync(r => r.Name == template.Name && r.ProjectId == null);
        if (found != null)
            return found;
        // Create a fresh instance (avoid reusing static object reference)
        var created = new ProjectRole
        {
            Id = template.Id,
            ProjectId = template.ProjectId,
            Name = template.Name,
            Description = template.Description
        };
        return await _projectRoleRepo.AddAsync(created);
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/get")]
public sealed class GetProjectOperation : OperationBase<GetProjectRequestDto, ProjectResponseDto>
{
    private readonly IRepository<Project> _repo;
    public GetProjectOperation(IRepository<Project> repo) => _repo = repo;
    protected override async Task<ProjectResponseDto> HandleAsync(GetProjectRequestDto request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        return new ProjectResponseDto(entity is null ? null : ProjectMapper.ToDto(entity));
    }
}

// SINGLE group-specific list operation (unchanged): gated by membership
[OperationGroup("Projects")]
[OperationRoute("project/list")]
public sealed class ListProjectsOperation : OperationBase<ListProjectsByGroupRequestDto, ProjectsResponseDto>
{
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<GroupMembership> _membershipRepo;
    private readonly IRepository<GroupRole> _roleRepo;
    public ListProjectsOperation(IRepository<Project> projectRepo, IRepository<GroupMembership> membershipRepo, IRepository<GroupRole> roleRepo)
    {
        _projectRepo = projectRepo;
        _membershipRepo = membershipRepo;
        _roleRepo = roleRepo;
    }

    protected override async Task<ProjectsResponseDto> HandleAsync(ListProjectsByGroupRequestDto request)
    {
        var memberships = await _membershipRepo.FindAllAsync(m => m.UserId == request.UserId && m.GroupId == request.GroupId);
        if (request.IsGroupOwner.HasValue)
            memberships = memberships.Where(m => m.IsGroupOwner == request.IsGroupOwner.Value);
        if (request.RoleId.HasValue)
        {
            var rid = request.RoleId.Value;
            memberships = memberships.Where(m => m.RoleId.HasValue && m.RoleId.Value == rid);
        }
        else if (!string.IsNullOrWhiteSpace(request.RoleName))
        {
            var roles = await _roleRepo.FindAllAsync(r => r.Name == request.RoleName && (r.GroupId == null || r.GroupId == request.GroupId));
            var roleIds = roles.Select(r => r.Id).ToHashSet();
            memberships = memberships.Where(m => m.RoleId.HasValue && roleIds.Contains(m.RoleId.Value));
        }

        if (!memberships.Any())
            return new ProjectsResponseDto(new());
        var projects = await _projectRepo.FindAllAsync(p => p.GroupId == request.GroupId);
        return new ProjectsResponseDto(projects.Select(ProjectMapper.ToDto).ToList());
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/update")]
public sealed class UpdateProjectOperation : OperationBase<UpdateProjectRequestDto, ProjectResponseDto>
{
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<ProjectMembership> _projectMemberRepo;
    private readonly IRepository<ProjectRole> _projectRoleRepo;
    public UpdateProjectOperation(IRepository<Project> projectRepo, IRepository<ProjectMembership> projectMemberRepo, IRepository<ProjectRole> projectRoleRepo)
    {
        _projectRepo = projectRepo;
        _projectMemberRepo = projectMemberRepo;
        _projectRoleRepo = projectRoleRepo;
    }

    protected override async Task<ProjectResponseDto> HandleAsync(UpdateProjectRequestDto request)
    {
        var entity = await _projectRepo.FindAsync(x => x.Id == request.Id);
        if (entity == null)
            return new ProjectResponseDto(null);
        var previousOwner = entity.OwnerUserId;
        if (request.Name != null)
            entity.Name = request.Name;
        if (request.GroupId.HasValue)
            entity.GroupId = request.GroupId.Value;
        if (request.OwnerUserId.HasValue)
            entity.OwnerUserId = request.OwnerUserId.Value;
        if (request.Description != null)
            entity.Description = request.Description;
        if (request.ImageUrl != null)
            entity.ImageUrl = request.ImageUrl;
        if (request.Metadata != null)
            entity.Metadata = request.Metadata;
        await _projectRepo.UpdateAsync(x => x.Id == request.Id, entity);
        // If OwnerUserId changed, ensure new owner has Owner role membership
        if (request.OwnerUserId.HasValue && request.OwnerUserId != previousOwner)
        {
            var ownerRole = await EnsureDefaultProjectRoleAsync(DefaultProjectRoles.Owner);
            var membership = await _projectMemberRepo.FindAsync(m => m.ProjectId == entity.Id && m.UserId == request.OwnerUserId.Value);
            if (membership is null)
            {
                await _projectMemberRepo.AddAsync(new ProjectMembership { Id = Guid.NewGuid(), ProjectId = entity.Id, UserId = request.OwnerUserId.Value, RoleId = ownerRole.Id, State = "Active" });
            }
            else if (membership.RoleId != ownerRole.Id)
            {
                membership.RoleId = ownerRole.Id;
                await _projectMemberRepo.UpdateAsync(m => m.Id == membership.Id, membership);
            }
        }

        return new ProjectResponseDto(ProjectMapper.ToDto(entity));
    }

    private async Task<ProjectRole> EnsureDefaultProjectRoleAsync(ProjectRole template)
    {
        var found = await _projectRoleRepo.FindAsync(r => r.Id == template.Id) ?? await _projectRoleRepo.FindAsync(r => r.Name == template.Name && r.ProjectId == null);
        if (found != null)
            return found;
        var created = new ProjectRole
        {
            Id = template.Id,
            ProjectId = template.ProjectId,
            Name = template.Name,
            Description = template.Description
        };
        return await _projectRoleRepo.AddAsync(created);
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/delete")]
public sealed class DeleteProjectOperation : OperationBase<DeleteProjectRequestDto, DeleteProjectResponseDto>
{
    private readonly IRepository<Project> _repo;
    public DeleteProjectOperation(IRepository<Project> repo) => _repo = repo;
    protected override async Task<DeleteProjectResponseDto> HandleAsync(DeleteProjectRequestDto request)
    {
        await _repo.DeleteAsync(x => x.Id == request.Id);
        return new DeleteProjectResponseDto(true);
    }
}
#endregion
