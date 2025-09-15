using Genspire.Application.Modules.Agentic.Projects.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Agentic.Projects.Operations;
// =========================
// DTOs
// =========================
public class SeedProjectRolesRequestDto
{
    /// <summary>When true, overwrite existing ProjectRoles that match by Id or (Name + ProjectId).</summary>
    public bool OverwriteExisting { get; set; } = false;
}

public class SeedProjectRolesResponseDto
{
    public int RolesSeeded { get; set; }
    public int RolesUpdated { get; set; }
    public List<ProjectRoleDto> SeededRoles { get; set; } = new();
    public List<ProjectRoleDto> UpdatedRoles { get; set; } = new();
}

// =========================
// Seed Default Project Roles
// =========================
[OperationGroup("Dev")]
[OperationRoute("project/seed/roles")]
public sealed class SeedProjectRoles : OperationBase<SeedProjectRolesRequestDto, SeedProjectRolesResponseDto>
{
    private readonly IRepository<ProjectRole> _roleRepo;
    public SeedProjectRoles(IRepository<ProjectRole> roleRepo)
    {
        _roleRepo = roleRepo;
    }

    protected override async Task<SeedProjectRolesResponseDto> HandleAsync(SeedProjectRolesRequestDto request)
    {
        var resp = new SeedProjectRolesResponseDto();
        var defaults = DefaultProjectRoles.All;
        var existing = await _roleRepo.GetAllAsync();
        foreach (var d in defaults)
        {
            var found = existing.FirstOrDefault(x => x.Id == d.Id) ?? existing.FirstOrDefault(x => x.Name.Equals(d.Name, StringComparison.OrdinalIgnoreCase) && x.ProjectId == d.ProjectId);
            if (found is null)
            {
                var entity = new ProjectRole
                {
                    Id = d.Id, // deterministic
                    ProjectId = d.ProjectId, // null => global role
                    Name = d.Name,
                    Description = d.Description
                };
                await _roleRepo.AddAsync(entity);
                resp.SeededRoles.Add(ProjectRoleMapper.ToDto(entity));
            }
            else if (request.OverwriteExisting)
            {
                found.ProjectId = d.ProjectId;
                found.Name = d.Name;
                found.Description = d.Description;
                await _roleRepo.UpdateAsync(x => x.Id == found.Id, found);
                resp.UpdatedRoles.Add(ProjectRoleMapper.ToDto(found));
            }
        }

        resp.RolesSeeded = resp.SeededRoles.Count;
        resp.RolesUpdated = resp.UpdatedRoles.Count;
        return resp;
    }
}