// File: Genspire/Application/Modules/Agentic/Sessions/Operations/SessionCrudOperations.cs

using Genspire.Application.Modules.Agentic.Sessions.Contracts;            // SessionDto, SessionMessageDto, *
using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;       // Domain entities
using Genspire.Application.Modules.Agentic.Sessions.Domain.Services;
using SpireCore.API.Operations;
using SpireCore.API.Operations.Attributes;
using SpireCore.Lists.Pagination;
using SpireCore.Repositories;
using System.ComponentModel;
using System.Linq.Expressions;

namespace Genspire.Application.Modules.Agentic.Sessions.Operations;

// ============================================================================
// Requests / Responses (operation-scoped, DO NOT redefine canonical message or session DTO types here)
// ============================================================================

public class CreateSessionRequest : IUserScopedRequest
{
    [DefaultValue(null)]
    public string? UserId { get; set; }

    [DefaultValue("New Session")]
    public string? Name { get; set; }

    [DefaultValue(null)]
    public string? Instructions { get; set; }

    [DefaultValue(false)]
    public bool IsTemporary { get; set; } = false;
}

public class GetSessionRequest : IUserScopedRequest
{
    public Guid Id { get; set; }

    [DefaultValue(null)]
    public string? UserId { get; set; }

    /// <summary>
    /// When true, includes the active SessionTimeline and SessionHistory.
    /// </summary>
    [DefaultValue(false)]
    public bool IncludeTimeline { get; set; } = false;

    /// <summary>
    /// When true, includes timeline + turns, with steps, messages, and feedback.
    /// </summary>
    [DefaultValue(false)]
    public bool IncludeTurns { get; set; } = false;
}


public class ListSessionsRequest : IUserScopedRequest
{
    [DefaultValue(null)]
    public string? UserId { get; set; }

    [DefaultValue(1)]
    public int Page { get; set; } = 1;

    [DefaultValue(10)]
    public int PageSize { get; set; } = 10;

    /// <summary>
    /// When true AND Page==1, returns all favorite sessions (not paginated).
    /// Page>1 returns no favorites.
    /// </summary>
    [DefaultValue(false)]
    public bool IncludeFavorites { get; set; } = false;
}

public class UpdateSessionRequest
{
    public Guid Id { get; set; }

    [DefaultValue(null)]
    public string? Name { get; set; }

    [DefaultValue(null)]
    public string? Instructions { get; set; }

    [DefaultValue(null)]
    public bool? IsTemporary { get; set; }
}

public class DeleteSessionRequest
{
    public Guid Id { get; set; }
}

public class SessionResponse
{
    /// <summary>Canonical session DTO from Contracts.</summary>
    public SessionDto? Session { get; set; }

    /// <summary>Set only when IncludeMessages=true.</summary>
    public List<SessionMessageDto>? Messages { get; set; }

    public SessionResponse() { }

    public SessionResponse(SessionDto? session, List<SessionMessageDto>? messages = null)
    {
        Session = session;
        Messages = messages;
    }
}

public class PagedSessionsResponse
{
    public PaginatedResult<SessionDto> Page { get; set; } = PaginatedResult<SessionDto>.Empty(1, 10);

    /// <summary>All favorite sessions (complete items, not paginated). Empty when Page>1 or IncludeFavorites=false.</summary>
    public List<SessionDto> Favorites { get; set; } = new();

    public PagedSessionsResponse() { }

    public PagedSessionsResponse(PaginatedResult<SessionDto> page, List<SessionDto> favorites)
    {
        Page = page;
        Favorites = favorites;
    }
}

public class DeleteSessionResponse
{
    public bool Success { get; set; }

    public DeleteSessionResponse() { }

    public DeleteSessionResponse(bool success) => Success = success;
}

// ============================================================================
// Helpers (mapping & pagination)
// ============================================================================

internal static class SessionCrudMapping
{
    private static SessionSettingsDto? MapSettings(SessionSettings? s)
        => s is null
            ? null
            : new SessionSettingsDto
            {
                Id = s.Id,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                GenerationSettings = s.GenerationSettings, // already canonical model
                IsDefault = s.IsDefault
            };

    private static SessionTypeDto? MapType(SessionType? t)
        => t is null
            ? null
            : new SessionTypeDto
            {
                Id = t.Id,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
                Name = t.Name,
                Description = t.Description,
                IsSystemType = t.IsSystemType,
                IsDefault = t.IsDefault
            };

    private static SessionStatsDto? MapStats(SessionStats? s)
        => s is null
            ? null
            : new SessionStatsDto
            {
                Id = s.Id,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                TotalTimelines = s.TotalTimelines,
                TotalTurns = s.TotalTurns,
                TotalMessages = s.TotalMessages,
                TotalInputTokens = s.TotalInputTokens,
                TotalOutputTokens = s.TotalOutputTokens,
                TotalCost = s.TotalCost,
                LastComputedAt = s.LastComputedAt
            };

    /// <summary>
    /// Map Domain Session → canonical Contracts.SessionDto.
    /// Only the stable header fields are filled; nested collections are for specialized endpoints.
    /// </summary>
    public static SessionDto ToContractsDto(Session s)
        => new SessionDto
        {
            Id = s.Id,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,

            UserId = s.UserId,
            Name = s.Name,
            Instructions = s.Instructions,
            IsTemporary = s.IsTemporary,
            LastActivityAt = s.LastActivityAt,

            SessionSettingsId = s.SessionSettingsId,
            SessionTypeId = s.SessionTypeId,
            SessionTimelineId = s.SessionTimelineId,
            SessionStatsId = s.SessionStatsId,

            Settings = MapSettings(s.Settings),
            SessionType = MapType(s.SessionType),
            // Do not auto-hydrate timeline; CRUD keeps it header-only unless specialized endpoint
            SessionTimeline = null,
            SessionStats = MapStats(s.SessionStats)
        };

    /// <summary>In-memory pagination with a stable "recent-first" ordering.</summary>
    public static PaginatedResult<SessionDto> PageAndMap(IEnumerable<Session> query, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var ordered = query
            .OrderByDescending(s => s.LastActivityAt)
            .ThenByDescending(s => s.UpdatedAt)
            .ThenByDescending(s => s.CreatedAt);

        var total = ordered.Count();
        var items = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ToContractsDto)
            .ToList();

        return new PaginatedResult<SessionDto>(items, total, page, pageSize);
    }
}

// ============================================================================
// Operations
// ============================================================================

[OperationRoute("session/create")]
public sealed class CreateSessionOperation : OperationBase<CreateSessionRequest, SessionResponse>
{
    private readonly IRepository<Session> _repo;

    public CreateSessionOperation(IRepository<Session> repo) => _repo = repo;

    protected override async Task<SessionResponse> HandleAsync(CreateSessionRequest request)
    {
        var now = DateTime.UtcNow;

        var entity = new Session
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            Name = string.IsNullOrWhiteSpace(request.Name) ? "New Session" : request.Name,
            Instructions = request.Instructions,
            IsTemporary = request.IsTemporary,
            LastActivityAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _repo.AddAsync(entity);

        var dto = SessionCrudMapping.ToContractsDto(entity);
        return new SessionResponse(dto);
    }
}

[OperationRoute("session/get")]
public sealed class GetSessionOperation : OperationBase<GetSessionRequest, SessionResponse>
{
    private readonly IRepository<Session> _sessionRepo;
    private readonly IRepository<SessionTimeline> _timelineRepo;
    private readonly IRepository<SessionTurn> _turnRepo;
    private readonly IRepository<TurnStep> _stepRepo;
    private readonly IRepository<SessionHistory> _historyRepo;
    private readonly IRepository<SessionMessageDb> _messageRepo;
    private readonly IRepository<SessionMessageFeedback> _feedbackRepo;

    public GetSessionOperation(
        IRepository<Session> sessionRepo,
        IRepository<SessionTimeline> timelineRepo,
        IRepository<SessionTurn> turnRepo,
        IRepository<TurnStep> stepRepo,
        IRepository<SessionHistory> historyRepo,
        IRepository<SessionMessageDb> messageRepo,
        IRepository<SessionMessageFeedback> feedbackRepo)
    {
        _sessionRepo = sessionRepo;
        _timelineRepo = timelineRepo;
        _turnRepo = turnRepo;
        _stepRepo = stepRepo;
        _historyRepo = historyRepo;
        _messageRepo = messageRepo;
        _feedbackRepo = feedbackRepo;
    }

    protected override async Task<SessionResponse> HandleAsync(GetSessionRequest request)
    {
        var session = await _sessionRepo.FindAsync(x => x.Id == request.Id);
        if (session is null) return new SessionResponse(null);

        // Optional multi-tenant guard
        if (!string.IsNullOrEmpty(request.UserId) &&
            !string.Equals(request.UserId, session.UserId, StringComparison.Ordinal))
        {
            return new SessionResponse(null);
        }

        // Map minimal session header
        var dto = session.ToDto();

        // Fast path: minimal header only
        if (!request.IncludeTimeline && !request.IncludeTurns)
            return new SessionResponse(dto);

        // Load active timeline header if requested (or implied by IncludeTurns)
        SessionTimeline? timeline = null;
        if (session.SessionTimelineId.HasValue &&
            (request.IncludeTimeline || request.IncludeTurns))
        {
            timeline = await _timelineRepo.FindAsync(t => t.Id == session.SessionTimelineId.Value);
            if (timeline != null)
                dto.SessionTimeline = timeline.ToDto(); // turns filled later only if IncludeTurns=true
        }

        // Attach SessionHistory when IncludeTimeline = true
        if (request.IncludeTimeline && timeline != null && dto.SessionTimeline != null)
        {
            SessionHistory? history = null;
            if (session.SessionHistoryId.HasValue)
                history = await _historyRepo.FindAsync(h => h.Id == session.SessionHistoryId.Value);

            history ??= await _historyRepo.FindAsync(h => h.SessionId == session.Id &&
                                                          h.TimelineId == timeline.Id);

            if (history != null)
            {
                var historyDto = history.ToDto();
                // Prefer a strong property on SessionTimelineDto: public SessionHistoryDto? SessionHistory { get; set; }
                // Use reflection so this remains drop-in even if property is not yet added.
                try
                {
                    var p = typeof(SessionTimelineDto).GetProperty("SessionHistory");
                    if (p != null && p.PropertyType == typeof(SessionHistoryDto))
                        p.SetValue(dto.SessionTimeline, historyDto);
                }
                catch { /* no-op */ }
            }
        }

        // If turns are not requested, stop here (timeline already set if requested)
        if (!request.IncludeTurns || timeline == null || dto.SessionTimeline == null)
            return new SessionResponse(dto);

        // --- IncludeTurns=true: hydrate turns + steps + messages + feedback ---
        var turns = (await _turnRepo.FindAllAsync(t => t.TimelineId == timeline.Id))
            .OrderBy(t => t.TimelineIndex)
            .ToList();

        var turnDtos = new List<SessionTurnDto>(turns.Count);
        var allMsgIds = new HashSet<Guid>();

        foreach (var turn in turns)
        {
            // Steps
            var steps = await _stepRepo.FindAllAsync(s => s.SessionTurnId == turn.Id);
            var stepDtos = steps
                .OrderBy(s => s.Index)
                .Select(s => s.ToDto())
                .ToList();

            // Messages (input + output) — map directly from DB form for performance
            List<SessionMessageDto>? inputDtos = null;
            List<SessionMessageDto>? outputDtos = null;

            if (turn.InputMessageIds.Count > 0)
            {
                var inputDb = await _messageRepo.FindAllAsync(m => turn.InputMessageIds.Contains(m.Id));
                inputDtos = inputDb
                    .Select(m => m.ToDto())
                    .OrderBy(m => m.CreatedAt)
                    .ToList();
                foreach (var id in turn.InputMessageIds) allMsgIds.Add(id);
            }

            if (turn.OutputMessageIds.Count > 0)
            {
                var outputDb = await _messageRepo.FindAllAsync(m => turn.OutputMessageIds.Contains(m.Id));
                outputDtos = outputDb
                    .Select(m => m.ToDto())
                    .OrderBy(m => m.CreatedAt)
                    .ToList();
                foreach (var id in turn.OutputMessageIds) allMsgIds.Add(id);
            }

            // Compose turn dto (use mapping for header, then attach hydrated lists)
            var turnDto = turn.ToDto();
            turnDto.Steps = stepDtos;
            turnDto.InputMessages = inputDtos;
            turnDto.OutputMessages = outputDtos;

            turnDtos.Add(turnDto);
        }

        // Feedback (bulk) — attach to every message
        if (allMsgIds.Count > 0)
        {
            var feedbacks = await _feedbackRepo.FindAllAsync(f => allMsgIds.Contains(f.MessageId));
            var fbByMsg = feedbacks
                .GroupBy(f => f.MessageId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.UpdatedAt).First());

            foreach (var t in turnDtos)
            {
                static void Attach(List<SessionMessageDto>? msgs, Dictionary<Guid, SessionMessageFeedback> map)
                {
                    if (msgs == null) return;
                    foreach (var m in msgs)
                    {
                        if (m.Id == Guid.Empty) continue;
                        if (map.TryGetValue(m.Id, out var fb))
                        {
                            m.FeedbackId = fb.Id;
                            m.Feedback = fb.ToDto();
                        }
                    }
                }

                Attach(t.InputMessages, fbByMsg);
                Attach(t.OutputMessages, fbByMsg);
            }
        }

        // Attach hydrated turns to timeline
        dto.SessionTimeline.SessionTurns = turnDtos;

        // Also provide a flat chronological stream in the response for convenience
        var flat = new List<SessionMessageDto>(turnDtos.Sum(t =>
            (t.InputMessages?.Count ?? 0) + (t.OutputMessages?.Count ?? 0)));

        foreach (var t in turnDtos.OrderBy(x => x.TimelineIndex))
        {
            if (t.InputMessages != null) flat.AddRange(t.InputMessages.OrderBy(m => m.CreatedAt));
            if (t.OutputMessages != null) flat.AddRange(t.OutputMessages.OrderBy(m => m.CreatedAt));
        }

        return new SessionResponse(dto, flat);
    }
}


[OperationAuthorize]
[OperationRoute("session/list")]
public sealed class ListSessionsOperation : OperationBase<ListSessionsRequest, PagedSessionsResponse>
{
    private readonly IRepository<Session> _sessionRepo;
    private readonly IRepository<SessionFavorite> _favoriteRepo;

    public ListSessionsOperation(IRepository<Session> sessionRepo, IRepository<SessionFavorite> favoriteRepo)
    {
        _sessionRepo = sessionRepo;
        _favoriteRepo = favoriteRepo;
    }

    protected override async Task<PagedSessionsResponse> HandleAsync(ListSessionsRequest request)
    {
        // Filter: only user's sessions (if provided) and non-temporary
        Expression<Func<Session, bool>> predicate =
            s => (string.IsNullOrEmpty(request.UserId) || s.UserId == request.UserId) &&
                 (s.IsTemporary != true);

        // IRepository<T> has no ordered paging; fetch, sort, then paginate in-memory
        var all = await _sessionRepo.FindAllAsync(predicate);
        var pageResult = SessionCrudMapping.PageAndMap(all, request.Page, request.PageSize);

        // Favorites (first page only)
        var favorites = new List<SessionDto>();
        if (request.IncludeFavorites && request.Page == 1 && !string.IsNullOrEmpty(request.UserId))
        {
            var favs = await _favoriteRepo.FindAllAsync(f => f.UserId == request.UserId);
            if (favs.Any())
            {
                var favIds = new HashSet<Guid>(
                    favs.Select(f =>
                    {
                        return Guid.TryParse(f.SessionId, out var g) ? g : Guid.Empty;
                    }).Where(g => g != Guid.Empty)
                );

                var favSessions = await _sessionRepo.FindAllAsync(
                    s => favIds.Contains(s.Id) && s.IsTemporary != true &&
                         (string.IsNullOrEmpty(request.UserId) || s.UserId == request.UserId));

                favorites = favSessions
                    .OrderByDescending(s => s.LastActivityAt)
                    .ThenByDescending(s => s.UpdatedAt)
                    .ThenByDescending(s => s.CreatedAt)
                    .Select(SessionCrudMapping.ToContractsDto)
                    .ToList();
            }
        }

        return new PagedSessionsResponse(pageResult, favorites);
    }
}

[OperationRoute("session/update")]
public sealed class UpdateSessionOperation : OperationBase<UpdateSessionRequest, SessionResponse>
{
    private readonly IRepository<Session> _repo;

    public UpdateSessionOperation(IRepository<Session> repo) => _repo = repo;

    protected override async Task<SessionResponse> HandleAsync(UpdateSessionRequest request)
    {
        var entity = await _repo.FindAsync(x => x.Id == request.Id);
        if (entity is null)
            return new SessionResponse(null);

        if (request.Name != null)
            entity.Name = request.Name;
        if (request.Instructions != null)
            entity.Instructions = request.Instructions;
        if (request.IsTemporary.HasValue)
            entity.IsTemporary = request.IsTemporary.Value;

        entity.UpdatedAt = DateTime.UtcNow;

        await _repo.UpdateAsync(x => x.Id == request.Id, entity);

        var dto = SessionCrudMapping.ToContractsDto(entity);
        return new SessionResponse(dto);
    }
}

[OperationRoute("session/delete")]
public sealed class DeleteSessionOperation : OperationBase<DeleteSessionRequest, DeleteSessionResponse>
{
    private readonly IRepository<Session> _repo;

    public DeleteSessionOperation(IRepository<Session> repo) => _repo = repo;

    protected override async Task<DeleteSessionResponse> HandleAsync(DeleteSessionRequest request)
    {
        await _repo.DeleteAsync(x => x.Id == request.Id);
        return new DeleteSessionResponse(true);
    }
}
