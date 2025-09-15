using Genspire.Application.Modules.Agentic.Projects.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Agentic.Projects.Operations;
#region ProjectMembership DTOs and Operations (refactored to match GroupMembership style)
public sealed class ProjectMemberDto
{
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public Guid? RoleId { get; set; }
    public string? RoleName { get; set; }
    public string? State { get; set; }
}

public sealed class AddProjectMemberRequestDto
{
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public Guid? RoleId { get; set; }
    public string? State { get; set; }
}

public sealed class RemoveProjectMemberRequestDto
{
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
}

public sealed class SetProjectMemberRoleRequestDto
{
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
}

public sealed class RevokeProjectMemberRoleRequestDto
{
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
}

public sealed class ListProjectMembersRequestDto
{
    // Filter by project
    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    // Filter by role (either by id or by name)
    public Guid? RoleId { get; set; }
    public string? RoleName { get; set; }
    // Optional: filter by user id (e.g., list a single user’s membership in a project)
    public Guid? UserId { get; set; }
}

public sealed class ProjectMembersResponseDto
{
    public List<ProjectMemberDto> Members { get; set; } = new();

    public ProjectMembersResponseDto()
    {
    }

    public ProjectMembersResponseDto(List<ProjectMemberDto> members) => Members = members;
}

internal static class ProjectMemberMapper
{
    public static ProjectMemberDto ToDto(ProjectMembership m, string? roleName = null) => new()
    {
        ProjectId = m.ProjectId,
        UserId = m.UserId,
        RoleId = m.RoleId,
        RoleName = roleName,
        State = m.State
    };
}

#endregion
#region Operations: Add / Remove Project Member
[OperationGroup("Projects")]
[OperationRoute("project/member/add")]
public sealed class AddProjectMemberOperation : OperationBase<AddProjectMemberRequestDto, OperationSuccessResponseDto>
{
    private readonly IRepository<ProjectMembership> _membershipRepo;
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<ProjectRole> _roleRepo;
    public AddProjectMemberOperation(IRepository<ProjectMembership> membershipRepo, IRepository<Project> projectRepo, IRepository<ProjectRole> roleRepo)
    {
        _membershipRepo = membershipRepo;
        _projectRepo = projectRepo;
        _roleRepo = roleRepo;
    }

    protected override async Task<OperationSuccessResponseDto> HandleAsync(AddProjectMemberRequestDto request)
    {
        // Ensure project exists
        var project = await _projectRepo.FindAsync(p => p.Id == request.ProjectId);
        if (project is null)
            return new OperationSuccessResponseDto(false);
        // Prevent duplicates
        var existing = await _membershipRepo.FindAsync(m => m.ProjectId == request.ProjectId && m.UserId == request.UserId);
        if (existing is not null)
            return new OperationSuccessResponseDto(true);
        // Optional: validate role if provided (no scope constraint assumed for ProjectRole)
        if (request.RoleId.HasValue)
        {
            var role = await _roleRepo.FindAsync(r => r.Id == request.RoleId.Value);
            if (role is null)
                return new OperationSuccessResponseDto(false);
        }

        var entity = new ProjectMembership
        {
            Id = Guid.NewGuid(),
            ProjectId = request.ProjectId,
            UserId = request.UserId,
            RoleId = request.RoleId,
            State = request.State
        };
        await _membershipRepo.AddAsync(entity);
        return new OperationSuccessResponseDto(true);
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/member/remove")]
public sealed class RemoveProjectMemberOperation : OperationBase<RemoveProjectMemberRequestDto, OperationSuccessResponseDto>
{
    private readonly IRepository<ProjectMembership> _membershipRepo;
    public RemoveProjectMemberOperation(IRepository<ProjectMembership> membershipRepo) => _membershipRepo = membershipRepo;
    protected override async Task<OperationSuccessResponseDto> HandleAsync(RemoveProjectMemberRequestDto request)
    {
        var deleted = await _membershipRepo.DeleteAsync(m => m.ProjectId == request.ProjectId && m.UserId == request.UserId);
        return new OperationSuccessResponseDto(deleted is not null);
    }
}

#endregion
#region Operations: Set / Revoke Project Member Role
[OperationGroup("Projects")]
[OperationRoute("project/member/role/set")]
public sealed class SetProjectMemberRoleOperation : OperationBase<SetProjectMemberRoleRequestDto, OperationSuccessResponseDto>
{
    private readonly IRepository<ProjectMembership> _membershipRepo;
    private readonly IRepository<ProjectRole> _roleRepo;
    public SetProjectMemberRoleOperation(IRepository<ProjectMembership> membershipRepo, IRepository<ProjectRole> roleRepo)
    {
        _membershipRepo = membershipRepo;
        _roleRepo = roleRepo;
    }

    protected override async Task<OperationSuccessResponseDto> HandleAsync(SetProjectMemberRoleRequestDto request)
    {
        var membership = await _membershipRepo.FindAsync(m => m.ProjectId == request.ProjectId && m.UserId == request.UserId);
        if (membership is null)
            return new OperationSuccessResponseDto(false);
        var role = await _roleRepo.FindAsync(r => r.Id == request.RoleId);
        if (role is null)
            return new OperationSuccessResponseDto(false);
        membership.RoleId = request.RoleId;
        await _membershipRepo.UpdateAsync(m => m.Id == membership.Id, membership);
        return new OperationSuccessResponseDto(true);
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/member/role/revoke")]
public sealed class RevokeProjectMemberRoleOperation : OperationBase<RevokeProjectMemberRoleRequestDto, OperationSuccessResponseDto>
{
    private readonly IRepository<ProjectMembership> _membershipRepo;
    public RevokeProjectMemberRoleOperation(IRepository<ProjectMembership> membershipRepo) => _membershipRepo = membershipRepo;
    protected override async Task<OperationSuccessResponseDto> HandleAsync(RevokeProjectMemberRoleRequestDto request)
    {
        var membership = await _membershipRepo.FindAsync(m => m.ProjectId == request.ProjectId && m.UserId == request.UserId);
        if (membership is null)
            return new OperationSuccessResponseDto(false);
        // Set to no explicit project role after revoke (mirrors original ProjectMembership behavior).
        // If you want a default Project role like Groups, inject a ProjectRole repo here and assign it.
        membership.RoleId = null;
        await _membershipRepo.UpdateAsync(m => m.Id == membership.Id, membership);
        return new OperationSuccessResponseDto(true);
    }
}

#endregion
#region Operation: List Project Members (generalized: by project id or name, and/or role)
[OperationGroup("Projects")]
[OperationRoute("project/member/list")]
public sealed class ListProjectMembersOperation : OperationBase<ListProjectMembersRequestDto, ProjectMembersResponseDto>
{
    private readonly IRepository<Project> _projectRepo;
    private readonly IRepository<ProjectMembership> _membershipRepo;
    private readonly IRepository<ProjectRole> _roleRepo;
    public ListProjectMembersOperation(IRepository<Project> projectRepo, IRepository<ProjectMembership> membershipRepo, IRepository<ProjectRole> roleRepo)
    {
        _projectRepo = projectRepo;
        _membershipRepo = membershipRepo;
        _roleRepo = roleRepo;
    }

    protected override async Task<ProjectMembersResponseDto> HandleAsync(ListProjectMembersRequestDto request)
    {
        // Resolve target project ids (by Id or Name)
        HashSet<Guid>? targetProjectIds = null;
        if (request.ProjectId.HasValue)
        {
            targetProjectIds = new HashSet<Guid>
            {
                request.ProjectId.Value
            };
        }
        else if (!string.IsNullOrWhiteSpace(request.ProjectName))
        {
            var p = await _projectRepo.FindAsync(x => x.Name == request.ProjectName);
            if (p is null)
                return new ProjectMembersResponseDto(new());
            targetProjectIds = new HashSet<Guid>
            {
                p.Id
            };
        }

        // Resolve role ids if filtering by name
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
            var roles = await _roleRepo.FindAllAsync(r => r.Name == request.RoleName);
            targetRoleIds = roles.Select(r => r.Id).ToHashSet();
        }

        // Load memberships and apply filters
        var memberships = await _membershipRepo.GetAllAsync();
        if (targetProjectIds is not null)
            memberships = memberships.Where(m => targetProjectIds.Contains(m.ProjectId));
        if (request.UserId.HasValue)
            memberships = memberships.Where(m => m.UserId == request.UserId.Value);
        if (targetRoleIds is not null)
            memberships = memberships.Where(m => m.RoleId.HasValue && targetRoleIds.Contains(m.RoleId.Value));
        var list = memberships.ToList();
        if (list.Count == 0)
            return new ProjectMembersResponseDto(new());
        // Enrich with role names
        var roleIds = list.Where(m => m.RoleId.HasValue).Select(m => m.RoleId!.Value).ToHashSet();
        var rolesLookup = roleIds.Count == 0 ? new Dictionary<Guid, string>() : (await _roleRepo.FindAllAsync(r => roleIds.Contains(r.Id))).ToDictionary(r => r.Id, r => r.Name);
        var dtos = list.Select(m => ProjectMemberMapper.ToDto(m, m.RoleId.HasValue && rolesLookup.TryGetValue(m.RoleId.Value, out var rn) ? rn : null)).ToList();
        return new ProjectMembersResponseDto(dtos);
    }
}
#endregion
