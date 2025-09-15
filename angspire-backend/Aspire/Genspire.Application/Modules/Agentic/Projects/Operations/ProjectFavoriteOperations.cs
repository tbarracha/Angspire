using Genspire.Application.Modules.Agentic.Projects.Domain.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Genspire.Application.Modules.Agentic.Projects.Operations;
#region Project Favorites (consistent Dto naming + list returns Projects, not relationships)
public class SetProjectFavoriteRequestDto
{
    public Guid UserId { get; set; }
    public Guid ProjectId { get; set; }
}

public class UnsetProjectFavoriteRequestDto
{
    public Guid UserId { get; set; }
    public Guid ProjectId { get; set; }
}

public class ListProjectFavoritesByUserRequestDto
{
    public Guid UserId { get; set; }
}

public class ProjectFavoriteDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ProjectId { get; set; }
    public DateTime FavoritedAt { get; set; }
}

public class ProjectFavoritesResponseDto
{
    public List<ProjectFavoriteDto> Favorites { get; set; } = new();

    public ProjectFavoritesResponseDto()
    {
    }

    public ProjectFavoritesResponseDto(List<ProjectFavoriteDto> favorites) => Favorites = favorites;
}

public class ProjectFavoriteChangedResponseDto
{
    public bool Success { get; set; }

    public ProjectFavoriteChangedResponseDto()
    {
    }

    public ProjectFavoriteChangedResponseDto(bool success) => Success = success;
}

public static class ProjectFavoriteMapper
{
    public static ProjectFavoriteDto ToDto(ProjectFavorite entity) => new ProjectFavoriteDto
    {
        Id = entity.Id,
        UserId = entity.UserId,
        ProjectId = entity.ProjectId,
        FavoritedAt = entity.FavoritedAt
    };
}

[OperationGroup("Projects")]
[OperationRoute("project/favorite/set")]
public sealed class SetProjectFavoriteOperation : OperationBase<SetProjectFavoriteRequestDto, ProjectFavoriteChangedResponseDto>
{
    private readonly IRepository<ProjectFavorite> _favRepo;
    public SetProjectFavoriteOperation(IRepository<ProjectFavorite> favRepo) => _favRepo = favRepo;
    protected override async Task<ProjectFavoriteChangedResponseDto> HandleAsync(SetProjectFavoriteRequestDto request)
    {
        var existing = await _favRepo.FindAsync(x => x.UserId == request.UserId && x.ProjectId == request.ProjectId);
        if (existing != null)
            return new ProjectFavoriteChangedResponseDto(true);
        await _favRepo.AddAsync(new ProjectFavorite { Id = Guid.NewGuid(), UserId = request.UserId, ProjectId = request.ProjectId, FavoritedAt = DateTime.UtcNow });
        return new ProjectFavoriteChangedResponseDto(true);
    }
}

[OperationGroup("Projects")]
[OperationRoute("project/favorite/unset")]
public sealed class UnsetProjectFavoriteOperation : OperationBase<UnsetProjectFavoriteRequestDto, ProjectFavoriteChangedResponseDto>
{
    private readonly IRepository<ProjectFavorite> _favRepo;
    public UnsetProjectFavoriteOperation(IRepository<ProjectFavorite> favRepo) => _favRepo = favRepo;
    protected override async Task<ProjectFavoriteChangedResponseDto> HandleAsync(UnsetProjectFavoriteRequestDto request)
    {
        var deleted = await _favRepo.DeleteAsync(x => x.UserId == request.UserId && x.ProjectId == request.ProjectId);
        return new ProjectFavoriteChangedResponseDto(deleted != null);
    }
}

// Return the actual Projects a user has favorited (not the relationship rows)
public class FavoriteProjectsResponseDto
{
    public List<ProjectDto> Projects { get; set; } = new();

    public FavoriteProjectsResponseDto()
    {
    }

    public FavoriteProjectsResponseDto(List<ProjectDto> projects) => Projects = projects;
}

[OperationGroup("Projects")]
[OperationRoute("project/favorite/list")]
public sealed class ListFavoriteProjectsByUserOperation : OperationBase<ListProjectFavoritesByUserRequestDto, FavoriteProjectsResponseDto>
{
    private readonly IRepository<ProjectFavorite> _favRepo;
    private readonly IRepository<Project> _projectRepo;
    public ListFavoriteProjectsByUserOperation(IRepository<ProjectFavorite> favRepo, IRepository<Project> projectRepo)
    {
        _favRepo = favRepo;
        _projectRepo = projectRepo;
    }

    protected override async Task<FavoriteProjectsResponseDto> HandleAsync(ListProjectFavoritesByUserRequestDto request)
    {
        var favorites = await _favRepo.FindAllAsync(x => x.UserId == request.UserId);
        if (!favorites.Any())
            return new FavoriteProjectsResponseDto(new());
        var projectIds = favorites.Select(f => f.ProjectId).ToHashSet();
        var projects = await _projectRepo.FindAllAsync(p => projectIds.Contains(p.Id));
        return new FavoriteProjectsResponseDto(projects.Select(ProjectMapper.ToDto).ToList());
    }
}
#endregion
