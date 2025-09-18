// File: Genspire.Application.Modules.Agentic.Sessions/Domain/Services/SessionDomainService.cs

using System.Text;
using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using Genspire.Application.Modules.GenAI.Client.AiClients;
using Genspire.Application.Modules.GenAI.Common.Completions.Models;
using MongoDB.Bson;
using Microsoft.Extensions.Logging;
using SpireCore.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.Agentic.Sessions.Domain.Services;

public interface ISessionDomainService : IScopedService
{
    Task<Guid> CreateSessionAsync(string userId, Guid? sessionSettingsId, bool isTemporary, string? instructions, CancellationToken ct = default);

    /// <summary>Create a new turn at the end of the active timeline and persist the input version.</summary>
    Task<(Guid TurnId, Guid ExecutionId)> AppendTurnAsync(Guid sessionId, SessionMessage inputMessage, CancellationToken ct = default);

    /// <summary>Start a new execution on an existing turn (used prior to streaming regen/output).</summary>
    Task<Guid> BeginNewExecutionAsync(Guid sessionId, Guid turnId, int? inputIndex = null, CancellationToken ct = default);

    /// <summary>Persist an output message version and select it.</summary>
    Task<SessionMessage> AttachOutputMessageAsync(Guid sessionId, Guid turnId, SessionMessage outputMessage, CancellationToken ct = default);

    /// <summary>Add a step to the given turn (auto-index within the current execution if Index not provided).</summary>
    Task<TurnStep> AddStepAsync(Guid turnId, TurnStep step, CancellationToken ct = default);

    /// <summary>Edit a past input: fork (or trim) timeline at pivot and open a new turn with the edited input.</summary>
    Task<(Guid NewTurnId, Guid NewTimelineId)> EditInputAsync(Guid sessionId, Guid pivotTurnId, SessionMessage newInputMessage, bool? forkTimeline, CancellationToken ct = default);

    Task SetActiveTimelineAsync(Guid sessionId, Guid timelineId, CancellationToken ct = default);
    Task<SessionStats> RecomputeStatsAsync(Guid sessionId, CancellationToken ct = default);

    Task<string> TryGenerateTitleAsync(string userText, string provider = "OpenRouter", string? model = "google/gemma-3-4b-it:free", CancellationToken ct = default);
}

public class SessionDomainService : ISessionDomainService
{
    private readonly IRepository<Session> _sessionsRepo;
    private readonly IRepository<SessionTimeline> _timelinesRepo;
    private readonly IRepository<SessionTurn> _turnsRepo;
    private readonly IRepository<SessionMessageDb> _messagesRepo;
    private readonly IRepository<TurnStep> _stepsRepo;
    private readonly IRepository<SessionStats> _statsRepo;
    private readonly ISessionHelperService _helper;
    private readonly ILogger<SessionDomainService> _log;

    public SessionDomainService(
        IRepository<Session> sessionsRepo,
        IRepository<SessionTimeline> timelinesRepo,
        IRepository<SessionTurn> turnsRepo,
        IRepository<SessionMessageDb> messagesRepo,
        IRepository<TurnStep> stepsRepo,
        IRepository<SessionStats> statsRepo,
        ISessionHelperService helper,
        ILogger<SessionDomainService> log)
    {
        _sessionsRepo = sessionsRepo;
        _timelinesRepo = timelinesRepo;
        _turnsRepo = turnsRepo;
        _messagesRepo = messagesRepo;
        _stepsRepo = stepsRepo;
        _statsRepo = statsRepo;
        _helper = helper;
        _log = log;
    }

    // -----------------------------------------------------------------------------
    // CreateSession
    // -----------------------------------------------------------------------------
    public async Task<Guid> CreateSessionAsync(string userId, Guid? sessionSettingsId, bool isTemporary, string? instructions, CancellationToken ct = default)
    {
        var session = new Session
        {
            UserId = userId,
            Instructions = instructions,
            IsTemporary = isTemporary,
            SessionSettingsId = sessionSettingsId,
            LastActivityAt = DateTime.UtcNow
        };

        session = await _sessionsRepo.AddAsync(session);

        var timeline = new SessionTimeline
        {
            SessionId = session.Id,
            Index = 0,
            IsDefault = true,
            IsAppendOnly = true,
            SessionTurnIds = new()
        };
        timeline = await _timelinesRepo.AddAsync(timeline);
        session.SessionTimelineId = timeline.Id;
        await _sessionsRepo.UpdateAsync(session);

        return session.Id;
    }

    // -----------------------------------------------------------------------------
    // AppendTurn (domain only): create turn + persist input version
    // -----------------------------------------------------------------------------
    public async Task<(Guid TurnId, Guid ExecutionId)> AppendTurnAsync(Guid sessionId, SessionMessage inputMessage, CancellationToken ct = default)
    {
        var session = await RequireSession(sessionId);
        var (timeline, _) = await RequireActiveTimeline(session);

        var turn = new SessionTurn
        {
            SessionId = session.Id,
            TimelineId = timeline.Id,
            TimelineIndex = timeline.SessionTurnIds.Count,
            CurrentExecutionId = Guid.NewGuid()
        };
        turn = await _turnsRepo.AddAsync(turn);

        // persist input (typed -> db)
        inputMessage.SessionId = session.Id;
        inputMessage.SessionTurnId = turn.Id;
        var inputDb = inputMessage.ToDb();
        inputDb = await _messagesRepo.AddAsync(inputDb);
        turn.InputMessageIds.Add(inputDb.Id);
        turn.SelectLatestInput();

        await _turnsRepo.UpdateAsync(turn);
        timeline.SessionTurnIds.Add(turn.Id);
        await _timelinesRepo.UpdateAsync(timeline);

        session.LastActivityAt = DateTime.UtcNow;
        await _sessionsRepo.UpdateAsync(session);

        return (turn.Id, turn.CurrentExecutionId);
    }

    // -----------------------------------------------------------------------------
    // BeginNewExecution: prepare a regen/stream by switching ExecutionId and (optionally) input selection
    // -----------------------------------------------------------------------------
    public async Task<Guid> BeginNewExecutionAsync(Guid sessionId, Guid turnId, int? inputIndex = null, CancellationToken ct = default)
    {
        var session = await RequireSession(sessionId);
        var turn = await RequireTurn(turnId, session.Id);

        if (inputIndex.HasValue)
        {
            var idx = inputIndex.Value;
            if (idx < 0 || idx >= turn.InputMessageIds.Count)
                throw new InvalidOperationException("Invalid input message index.");
            turn.SelectedInputIndex = idx;
        }

        turn.CurrentExecutionId = Guid.NewGuid();
        await _turnsRepo.UpdateAsync(turn);

        session.LastActivityAt = DateTime.UtcNow;
        await _sessionsRepo.UpdateAsync(session);

        return turn.CurrentExecutionId;
    }

    // -----------------------------------------------------------------------------
    // AttachOutputMessage: persist an output version for a turn
    // -----------------------------------------------------------------------------
    public async Task<SessionMessage> AttachOutputMessageAsync(Guid sessionId, Guid turnId, SessionMessage outputMessage, CancellationToken ct = default)
    {
        var session = await RequireSession(sessionId);
        var turn = await RequireTurn(turnId, session.Id);

        outputMessage.SessionId = session.Id;
        outputMessage.SessionTurnId = turn.Id;

        var outputDb = outputMessage.ToDb();
        outputDb = await _messagesRepo.AddAsync(outputDb);

        turn.OutputMessageIds.Add(outputDb.Id);
        turn.SelectLatestOutput();
        await _turnsRepo.UpdateAsync(turn);

        session.LastActivityAt = DateTime.UtcNow;
        await _sessionsRepo.UpdateAsync(session);

        return outputDb.ToDomain();
    }

    // -----------------------------------------------------------------------------
    // AddStep: append a step to the turn within the current (or provided) execution
    // -----------------------------------------------------------------------------
    public async Task<TurnStep> AddStepAsync(Guid turnId, TurnStep step, CancellationToken ct = default)
    {
        var turn = await _turnsRepo.FindAsync(t => t.Id == turnId) ?? throw new InvalidOperationException("Turn not found.");

        var execId = step.ExecutionId ?? turn.CurrentExecutionId;
        if (execId == Guid.Empty)
            throw new InvalidOperationException("ExecutionId is required (none active on the turn).");

        // determine ordering within execution
        var existing = await _stepsRepo.FindAllAsync(s => s.SessionTurnId == turnId && s.ExecutionId == execId);
        var nextIndex = existing.Any() ? existing.Max(s => s.Index) + 1 : 0;

        step.SessionTurnId = turnId;
        step.ExecutionId = execId;
        step.Index = step.Index <= 0 ? nextIndex : step.Index;

        var prev = existing.OrderBy(s => s.Index).LastOrDefault();
        step.PreviousStepId ??= prev?.Id;

        step.Payload ??= new BsonDocument();

        step = await _stepsRepo.AddAsync(step);
        turn.StepIds.Add(step.Id);
        await _turnsRepo.UpdateAsync(turn);

        return step;
    }

    // -----------------------------------------------------------------------------
    // EditInput: fork/trim, then open a new turn with edited input
    // -----------------------------------------------------------------------------
    public async Task<(Guid NewTurnId, Guid NewTimelineId)> EditInputAsync(Guid sessionId, Guid pivotTurnId, SessionMessage newInputMessage, bool? forkTimeline, CancellationToken ct = default)
    {
        var session = await RequireSession(sessionId);

        var timelines = (await _timelinesRepo.FindAllAsync(t => t.SessionId == session.Id)).ToList();
        var baseTl = timelines.FirstOrDefault(t => t.SessionTurnIds.Contains(pivotTurnId))
                  ?? throw new InvalidOperationException("Pivot turn not found in any session timeline.");

        var pivotIdx = baseTl.SessionTurnIds.IndexOf(pivotTurnId);
        var isMidHistory = pivotIdx != baseTl.SessionTurnIds.Count - 1;
        var shouldFork = forkTimeline ?? isMidHistory;

        SessionTimeline targetTl = baseTl;
        if (shouldFork)
        {
            var nextIndex = await MaxTimelineIndex(session.Id) + 1;
            targetTl = new SessionTimeline
            {
                SessionId = session.Id,
                PreviousTimelineId = baseTl.Id,
                Index = nextIndex,
                IsDefault = false,
                IsAppendOnly = true,
                DivergenceTurnIndex = pivotIdx,
                SessionTurnIds = baseTl.SessionTurnIds.Take(pivotIdx).ToList()
            };
            targetTl = await _timelinesRepo.AddAsync(targetTl);
            session.SessionTimelineId = targetTl.Id; // activate fork
            await _sessionsRepo.UpdateAsync(session);
        }
        else
        {
            targetTl.SessionTurnIds = targetTl.SessionTurnIds.Take(pivotIdx).ToList();
            await _timelinesRepo.UpdateAsync(targetTl);
        }

        var prevTurnId = targetTl.SessionTurnIds.LastOrDefault();
        var newTurn = new SessionTurn
        {
            SessionId = session.Id,
            TimelineId = targetTl.Id,
            PreviousTurnId = prevTurnId,
            TimelineIndex = targetTl.SessionTurnIds.Count,
            CurrentExecutionId = Guid.NewGuid()
        };
        newTurn = await _turnsRepo.AddAsync(newTurn);

        // Persist edited input
        newInputMessage.SessionId = session.Id;
        newInputMessage.SessionTurnId = newTurn.Id;

        var inputDb = newInputMessage.ToDb();
        inputDb = await _messagesRepo.AddAsync(inputDb);
        newTurn.InputMessageIds.Add(inputDb.Id);
        newTurn.SelectLatestInput();
        await _turnsRepo.UpdateAsync(newTurn);

        targetTl.SessionTurnIds.Add(newTurn.Id);
        await _timelinesRepo.UpdateAsync(targetTl);

        session.LastActivityAt = DateTime.UtcNow;
        await _sessionsRepo.UpdateAsync(session);

        return (newTurn.Id, targetTl.Id);
    }

    public async Task SetActiveTimelineAsync(Guid sessionId, Guid timelineId, CancellationToken ct = default)
    {
        var session = await RequireSession(sessionId);
        var timeline = await _timelinesRepo.FindAsync(t => t.Id == timelineId)
                       ?? throw new InvalidOperationException("Timeline not found.");
        if (timeline.SessionId != session.Id)
            throw new InvalidOperationException("Timeline does not belong to the session.");

        session.SessionTimelineId = timelineId;
        session.LastActivityAt = DateTime.UtcNow;
        await _sessionsRepo.UpdateAsync(session);
    }

    public async Task<SessionStats> RecomputeStatsAsync(Guid sessionId, CancellationToken ct = default)
    {
        var session = await RequireSession(sessionId);

        // Load aggregates
        var timelines = (await _timelinesRepo.FindAllAsync(t => t.SessionId == session.Id)).ToList();
        var turns = (await _turnsRepo.FindAllAsync(t => t.SessionId == session.Id)).ToList();
        var messages = (await _messagesRepo.FindAllAsync(m => m.SessionId == session.Id)).ToList();

        // Tally usage
        long inTok = 0, outTok = 0;
        decimal cost = 0m;
        foreach (var m in messages)
        {
            if (m.Usage is null) continue;
            if (TryGetLong(m.Usage, "input_tokens", out var ti)) inTok += ti;
            if (TryGetLong(m.Usage, "output_tokens", out var to)) outTok += to;
            if (TryGetDecimal(m.Usage, "cost", out var c)) cost += c;
        }

        // Load existing stats if the pointer is valid; otherwise create new (first run or stale pointer)
        SessionStats? stats = null;
        if (session.SessionStatsId.HasValue && session.SessionStatsId.Value != Guid.Empty)
        {
            var statsId = session.SessionStatsId.Value;
            stats = await _statsRepo.FindAsync(s => s.Id == statsId);
        }

        var isNew = stats is null;
        if (isNew)
        {
            stats = new SessionStats
            {
                Id = Guid.NewGuid() // ensure non-empty id on first create
            };
        }

        // Update fields
        stats.TotalTimelines = timelines.Count;
        stats.TotalTurns = turns.Count;
        stats.TotalMessages = messages.Count;
        stats.TotalInputTokens = inTok;
        stats.TotalOutputTokens = outTok;
        stats.TotalCost = cost;
        stats.LastComputedAt = DateTime.UtcNow;

        // Persist (create or update)
        stats = isNew ? await _statsRepo.AddAsync(stats) : await _statsRepo.UpdateAsync(stats);

        // Ensure session points at the stats doc (only write if changed)
        if (!session.SessionStatsId.HasValue || session.SessionStatsId.Value != stats.Id)
        {
            session.SessionStatsId = stats.Id;
            await _sessionsRepo.UpdateAsync(session);
        }

        return stats;
    }

    public async Task<string> TryGenerateTitleAsync(
        string userText,
        string provider = "OpenRouter",
        string? model = "google/gemma-3-4b-it:free",
        CancellationToken ct = default)
    {
        // Fast guards
        if (string.IsNullOrWhiteSpace(userText))
            return "New Session";

        try
        {
            // Resolve provider/model/client
            var (client, endpoint, modelCfg, providerCfg) = await _helper.ResolveClientAsync(provider, model, ct);

            // Keep instructions inside the user message (works across diverse providers)
            var sample = _helper.FirstNWords(userText, 32);
            var prompt = new StringBuilder()
                .AppendLine("Based on the user message, create a short clean chat session title.")
                .AppendLine("Requirements:")
                .AppendLine("- Title MUST be in the same language as the user's message.")
                .AppendLine("- Return ONLY the title text. No quotes. No trailing punctuation. No extra text.")
                .AppendLine()
                .AppendLine("User message:")
                .Append(sample)
                .ToString();

            var req = new ChatRequest
            {
                Provider = providerCfg.Name,
                Model = modelCfg?.Name,
                Stream = false,
                Messages = new List<ChatMessage>
                {
                    new() { Role = AgenticRoles.USER, Content = prompt }
                }
            };

            var res = await client.CreateChatCompletionAsync(req, endpoint, providerCfg.Name, ct);
            var candidate = _helper.ExtractFinalText(res).Trim();

            if (!string.IsNullOrWhiteSpace(candidate))
                return _helper.CleanTitle(candidate);
        }
        catch (OperationCanceledException)
        {
            // Respect caller cancellation – return a harmless default
            return "New Session";
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Title generation failed.");
        }

        // Fallback
        return "New Session";
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------
    private async Task<Session> RequireSession(Guid id)
        => await _sessionsRepo.FindAsync(s => s.Id == id) ?? throw new InvalidOperationException("Session not found.");

    private async Task<(SessionTimeline active, bool created)> RequireActiveTimeline(Session session)
    {
        if (session.SessionTimelineId.HasValue)
        {
            var tl = await _timelinesRepo.FindAsync(t => t.Id == session.SessionTimelineId.Value);
            if (tl != null) return (tl, false);
        }

        var all = await _timelinesRepo.FindAllAsync(t => t.SessionId == session.Id);
        var maxIndex = all.Any() ? all.Max(t => t.Index) : -1;
        var timeline = new SessionTimeline
        {
            SessionId = session.Id,
            Index = maxIndex + 1,
            IsDefault = maxIndex < 0,
            IsAppendOnly = true,
            SessionTurnIds = new()
        };
        timeline = await _timelinesRepo.AddAsync(timeline);
        session.SessionTimelineId = timeline.Id;
        await _sessionsRepo.UpdateAsync(session);
        return (timeline, true);
    }

    private async Task<int> MaxTimelineIndex(Guid sessionId)
    {
        var all = await _timelinesRepo.FindAllAsync(t => t.SessionId == sessionId);
        return all.Any() ? all.Max(t => t.Index) : -1;
    }

    private async Task<SessionTurn> RequireTurn(Guid turnId, Guid sessionId)
    {
        var t = await _turnsRepo.FindAsync(x => x.Id == turnId) ?? throw new InvalidOperationException("Turn not found.");
        if (t.SessionId != sessionId) throw new InvalidOperationException("Turn does not belong to session.");
        return t;
    }

    private static bool TryGetLong(Dictionary<string, object> dic, string key, out long value)
    {
        value = 0;
        if (!dic.TryGetValue(key, out var v) || v is null) return false;
        try { value = Convert.ToInt64(v); return true; } catch { return false; }
    }

    private static bool TryGetDecimal(Dictionary<string, object> dic, string key, out decimal value)
    {
        value = 0m;
        if (!dic.TryGetValue(key, out var v) || v is null) return false;
        try { value = Convert.ToDecimal(v); return true; } catch { return false; }
    }
}
