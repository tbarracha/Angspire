using Genspire.Application.Modules.Agentic.Sessions.Domain.Repositories;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;

namespace Genspire.Application.Modules.Agentic.Sessions.Operations;
#region Contracts
// --- Request DTOs ---
public record SetFavoriteSessionRequest(string UserId, string SessionId);
public record UnsetFavoriteSessionRequest(string UserId, string SessionId);
public record ListFavoriteSessionsRequest(string UserId, Guid? SessionTypeId = null);
public record DevUnsetAllFavoritesRequest(string? UserId = null); // null = all users
// --- Response DTOs ---
public record SetFavoriteSessionResponseDto(bool Success);
public record UnsetFavoriteSessionResponseDto(bool Success);
public record ListFavoriteSessionsResponseDto(List<AgenticSessionFavoriteDto> Favorites);
public record DevUnsetAllFavoritesResponseDto(int UpdatedCount);
// Projection DTO for frontend
public record AgenticSessionFavoriteDto(string Id, string UserId, string SessionId, Guid? SessionTypeId, DateTime FavoritedAt);
#endregion
#region Operations
[OperationRoute("session/favorite/set")]
public sealed class SetAgenticSessionFavoriteOperation : OperationBase<SetFavoriteSessionRequest, SetFavoriteSessionResponseDto>
{
    private readonly SessionRepository _sessionRepo;
    private readonly SessionFavoriteRepository _favRepo;
    public SetAgenticSessionFavoriteOperation(SessionRepository sessionRepo, SessionFavoriteRepository favRepo)
    {
        _sessionRepo = sessionRepo;
        _favRepo = favRepo;
    }

    protected override async Task<SetFavoriteSessionResponseDto> HandleAsync(SetFavoriteSessionRequest request)
    {
        var session = await _sessionRepo.GetByIdAsync(Guid.Parse(request.SessionId));
        if (session == null)
            return new SetFavoriteSessionResponseDto(false);
        await _favRepo.AddFavoriteAsync(request.UserId, request.SessionId, session.SessionTypeId);
        return new SetFavoriteSessionResponseDto(true);
    }
}

[OperationRoute("session/favorite/unset")]
public sealed class UnsetAgenticSessionFavoriteOperation : OperationBase<UnsetFavoriteSessionRequest, UnsetFavoriteSessionResponseDto>
{
    private readonly SessionFavoriteRepository _repo;
    public UnsetAgenticSessionFavoriteOperation(SessionFavoriteRepository repo) => _repo = repo;
    protected override async Task<UnsetFavoriteSessionResponseDto> HandleAsync(UnsetFavoriteSessionRequest request)
    {
        await _repo.RemoveFavoriteAsync(request.UserId, request.SessionId);
        return new UnsetFavoriteSessionResponseDto(true);
    }
}

/// <summary>
/// List all favorite session entities for a user (optionally filtered by type).
/// </summary>
[OperationRoute("session/favorite/list")]
public sealed class ListAgenticSessionFavoritesOperation : OperationBase<ListFavoriteSessionsRequest, ListFavoriteSessionsResponseDto>
{
    private readonly SessionFavoriteRepository _repo;
    public ListAgenticSessionFavoritesOperation(SessionFavoriteRepository repo) => _repo = repo;
    protected override async Task<ListFavoriteSessionsResponseDto> HandleAsync(ListFavoriteSessionsRequest request)
    {
        var favorites = await _repo.GetFavoritesByUserAsync(request.UserId, request.SessionTypeId);
        var dtos = favorites.Select(x => new AgenticSessionFavoriteDto(x.Id.ToString(), x.UserId, x.SessionId, x.SessionTypeId, x.FavoritedAt)).ToList();
        return new ListFavoriteSessionsResponseDto(dtos);
    }
}

/// <summary>
/// DEV-ONLY: Removes all favorite session entities (for all or a specific user).
/// </summary>
[OperationRoute("session/favorite/dev/unset-all")]
public sealed class DevUnsetAllAgenticSessionFavoritesOperation : OperationBase<DevUnsetAllFavoritesRequest, DevUnsetAllFavoritesResponseDto>
{
    private readonly SessionFavoriteRepository _repo;
    public DevUnsetAllAgenticSessionFavoritesOperation(SessionFavoriteRepository repo) => _repo = repo;
    protected override async Task<DevUnsetAllFavoritesResponseDto> HandleAsync(DevUnsetAllFavoritesRequest request)
    {
        int removedCount;
        if (!string.IsNullOrEmpty(request.UserId))
        {
            removedCount = await _repo.DeleteRangeAsync(f => f.UserId == request.UserId);
        }
        else
        {
            removedCount = await _repo.DeleteRangeAsync(_ => true);
        }

        return new DevUnsetAllFavoritesResponseDto(removedCount);
    }
}
#endregion
