using Identity.Groups.Models;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Repositories;

namespace Identity.Groups.Operations;

public class SetGroupFavoriteRequestDto
{
    public Guid UserId { get; set; }
    public Guid GroupId { get; set; }
}

public class UnsetGroupFavoriteRequestDto
{
    public Guid UserId { get; set; }
    public Guid GroupId { get; set; }
}

public class ListGroupFavoritesByUserRequestDto
{
    public Guid UserId { get; set; }
}

public class GroupFavoriteDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid GroupId { get; set; }
    public DateTime FavoritedAt { get; set; }
}

public class GroupFavoritesResponseDto
{
    public List<GroupFavoriteDto> Favorites { get; set; } = new();

    public GroupFavoritesResponseDto()
    {
    }

    public GroupFavoritesResponseDto(List<GroupFavoriteDto> favorites) => Favorites = favorites;
}

public class GroupFavoriteChangedResponseDto
{
    public bool Success { get; set; }

    public GroupFavoriteChangedResponseDto()
    {
    }

    public GroupFavoriteChangedResponseDto(bool success) => Success = success;
}

public static class GroupFavoriteMapper
{
    public static GroupFavoriteDto ToDto(GroupFavorite entity) => new GroupFavoriteDto
    {
        Id = entity.Id,
        UserId = entity.UserId,
        GroupId = entity.GroupId,
        FavoritedAt = entity.FavoritedAt
    };
}

[OperationGroup("Groups")]
[OperationRoute("group/favorite/set")]
public sealed class SetGroupFavoriteOperation : OperationBase<SetGroupFavoriteRequestDto, GroupFavoriteChangedResponseDto>
{
    private readonly IRepository<GroupFavorite> _favRepo;
    public SetGroupFavoriteOperation(IRepository<GroupFavorite> favRepo) => _favRepo = favRepo;
    protected override async Task<GroupFavoriteChangedResponseDto> HandleAsync(SetGroupFavoriteRequestDto request)
    {
        var existing = await _favRepo.FindAsync(x => x.UserId == request.UserId && x.GroupId == request.GroupId);
        if (existing != null)
            return new GroupFavoriteChangedResponseDto(true);
        await _favRepo.AddAsync(new GroupFavorite { Id = Guid.NewGuid(), UserId = request.UserId, GroupId = request.GroupId, FavoritedAt = DateTime.UtcNow });
        return new GroupFavoriteChangedResponseDto(true);
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/favorite/unset")]
public sealed class UnsetGroupFavoriteOperation : OperationBase<UnsetGroupFavoriteRequestDto, GroupFavoriteChangedResponseDto>
{
    private readonly IRepository<GroupFavorite> _favRepo;
    public UnsetGroupFavoriteOperation(IRepository<GroupFavorite> favRepo) => _favRepo = favRepo;
    protected override async Task<GroupFavoriteChangedResponseDto> HandleAsync(UnsetGroupFavoriteRequestDto request)
    {
        var deleted = await _favRepo.DeleteAsync(x => x.UserId == request.UserId && x.GroupId == request.GroupId);
        return new GroupFavoriteChangedResponseDto(deleted != null);
    }
}

[OperationGroup("Groups")]
[OperationRoute("group/favorite/list")]
public sealed class ListFavoriteGroupsByUserOperation : OperationBase<ListGroupFavoritesByUserRequestDto, GroupsResponseDto>
{
    private readonly IRepository<GroupFavorite> _favRepo;
    private readonly IRepository<Group> _groupRepo;
    public ListFavoriteGroupsByUserOperation(IRepository<GroupFavorite> favRepo, IRepository<Group> groupRepo)
    {
        _favRepo = favRepo;
        _groupRepo = groupRepo;
    }

    protected override async Task<GroupsResponseDto> HandleAsync(ListGroupFavoritesByUserRequestDto request)
    {
        var favorites = await _favRepo.FindAllAsync(x => x.UserId == request.UserId);
        if (!favorites.Any())
            return new GroupsResponseDto(new());
        var groupIds = favorites.Select(f => f.GroupId).ToHashSet();
        var groups = await _groupRepo.FindAllAsync(g => groupIds.Contains(g.Id));
        return new GroupsResponseDto(groups.Select(GroupMapper.ToDto).ToList());
    }
}