// File: Genspire/Application/Modules/Agentic/Sessions/Domain/Services/SessionStreamingService.cs

using Genspire.Application.Modules.Agentic.Constants;
using Genspire.Application.Modules.Agentic.Sessions.Contracts;
using Genspire.Application.Modules.Agentic.Sessions.Contracts.Dtos;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Repositories;
using Genspire.Application.Modules.GenAI.Common.Completions.Models;
using Genspire.Application.Modules.GenAI.Generation.Settings.Models;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using SpireCore.Repositories;
using SpireCore.Services;
using System.Diagnostics;
using System.Threading.Channels;

namespace Genspire.Application.Modules.Agentic.Sessions.Domain.Services;

public interface ISessionStreamingService : IScopedService
{
    IAsyncEnumerable<SessionStreamEventDto> ChatAsync(SessionChatRequestDto req, CancellationToken ct = default);
    IAsyncEnumerable<SessionStreamEventDto> EditInputAsync(SessionEditChatMessageRequestDto req, CancellationToken ct = default);
    IAsyncEnumerable<SessionStreamEventDto> RegenerateAsync(SessionRegenerateChatMessageRequestDto req, CancellationToken ct = default);
}

public sealed class SessionStreamingService : ISessionStreamingService
{
    private readonly ISessionDomainService _domain;
    private readonly ISessionHelperService _helper;

    // lightweight reads
    private readonly IReadonlyRepository<Session> _sessions;
    private readonly IReadonlyRepository<SessionTimeline> _timelines;
    private readonly IReadonlyRepository<SessionTurn> _turns;
    private readonly IReadonlyRepository<SessionMessageDb> _messages;
    private readonly IReadonlyRepository<TurnStep> _steps;

    // summaries / history
    private readonly SessionHistoryRepository _histories;
    private readonly SessionSummaryRepository _summaries;

    private readonly ILogger<SessionStreamingService> _log;

    public SessionStreamingService(
        ISessionDomainService domain,
        ISessionHelperService helper,
        IReadonlyRepository<Session> sessions,
        IReadonlyRepository<SessionTimeline> timelines,
        IReadonlyRepository<SessionTurn> turns,
        IReadonlyRepository<SessionMessageDb> messages,
        IReadonlyRepository<TurnStep> steps,
        SessionHistoryRepository histories,
        SessionSummaryRepository summaries,
        ILogger<SessionStreamingService> log)
    {
        _domain = domain;
        _helper = helper;
        _sessions = sessions;
        _timelines = timelines;
        _turns = turns;
        _messages = messages;
        _steps = steps;
        _histories = histories;
        _summaries = summaries;
        _log = log;
    }

    // ============================================================
    // Chat (append new turn and generate)
    // ============================================================

    public IAsyncEnumerable<SessionStreamEventDto> ChatAsync(SessionChatRequestDto req, CancellationToken ct = default)
    {
        var requestId = req.ClientRequestId ?? Guid.NewGuid().ToString("N");
        var ch = Channel.CreateUnbounded<SessionStreamEventDto>(new UnboundedChannelOptions { SingleReader = true, SingleWriter = true });

        _ = Task.Run(async () =>
        {
            var seq = 0;
            var sw = Stopwatch.StartNew();
            void Info(string msg)
            {
                try { _log.LogInformation("[SessionStreamingService.Chat] {Msg}", msg); }
                catch { /* best effort logging */ }
            }

            try
            {
                Info($"BEGIN reqId={requestId} userId={req.UserId ?? "null"} sessionId={(req.SessionId?.ToString() ?? "null")} createNew={(req.CreateNew?.ToString() ?? "null")} timelineId={(req.TimelineId?.ToString() ?? "null")} provider={req.Provider ?? "(session default)"} model={req.Model ?? "(session default)"} stream={req.Stream}");

                // 1) session (create or use existing)
                Guid sessionId;
                var sessionCreated = false;

                if (req.CreateNew == true || !req.SessionId.HasValue)
                {
                    Info("S1: Creating new session…");
                    sessionId = await _domain.CreateSessionAsync(
                        userId: req.UserId ?? "anonymous",
                        sessionSettingsId: null,
                        isTemporary: req.IsTemporary ?? false,
                        instructions: req.Instructions,
                        ct);
                    sessionCreated = true;
                    Info($"S1: Created session {sessionId}");
                }
                else
                {
                    sessionId = req.SessionId!.Value;
                    Info($"S1: Using existing session {sessionId}");
                    if (req.TimelineId.HasValue)
                    {
                        Info($"S1.1: Setting active timeline = {req.TimelineId.Value}");
                        await _domain.SetActiveTimelineAsync(sessionId, req.TimelineId.Value, ct);
                        Info("S1.1: Active timeline set");
                    }
                }

                var session = await _sessions.FindAsync(s => s.Id == sessionId) ?? throw new InvalidOperationException("Session not found.");

                var activeTimelineId = session.SessionTimelineId;
                Info($"S1: Loaded session header. ActiveTimelineId={activeTimelineId?.ToString() ?? "null"}");

                if (activeTimelineId.HasValue)
                {
                    var activeTimeline = await _timelines.FindAsync(t => t.Id == activeTimelineId.Value);
                    if (activeTimeline != null)
                        Info($"S1: Active timeline found. Index={activeTimeline.Index} turns={activeTimeline.SessionTurnIds?.Count ?? 0} prev={activeTimeline.PreviousTimelineId?.ToString() ?? "null"}");
                    else
                        Info("S1: Active timeline id present but timeline not found.");
                }

                // 2) provider/model + args
                var baseSettings = ResolveBaseGenSettings(session, req);
                var provider = req.Provider ?? baseSettings?.Text?.Provider ?? "OpenRouter";
                var model = req.Model ?? baseSettings?.Text?.Model ?? "google/gemma-3-4b-it:free";
                var gen = _helper.BuildChatArgs(baseSettings, provider, model, req.Stream, req.EnableThinking);

                // 3) create turn + persist input
                Info("S3: Mapping inbound input to domain model…");
                var inputDomain = SessionMappingService.ToDomain(req.Input);

                Info("S3: Appending new turn…");
                var (turnId, executionId) = await _domain.AppendTurnAsync(sessionId, inputDomain, ct);
                Info($"S3: Turn appended turnId={turnId} execId={executionId}");

                var turn = await _turns.FindAsync(t => t.Id == turnId) ?? throw new InvalidOperationException("Turn not found.");
                Info($"S3: Loaded turn timelineId={turn.TimelineId?.ToString() ?? "null"} timelineIndex={turn.TimelineIndex}");

                var inputMessageId = turn.InputMessageIds.Last();

                // ---- PRE-ALLOCATE output id so FE can reserve a slot
                var plannedOutputMessageId = Guid.NewGuid();

                // ---- ACK (seq 0) with all ids so FE can build shells immediately
                await WriteAsync(ch, New<AckEventDto>(requestId, SessionOperationKind.Chat, seq++, e =>
                {
                    e.SessionId = sessionId;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turnId;
                    e.ExecutionId = executionId;

                    e.Provider = provider;
                    e.Model = model;
                    e.SessionCreated = sessionCreated;

                    e.InputMessageId = inputMessageId;
                    e.OutputMessageId = plannedOutputMessageId; // reserved id; will be used on commit
                }), ct);
                Info($"S3: Ack written with ids input={inputMessageId} output={plannedOutputMessageId}");

                // (optional) echo granular frames for consumers that rely on them
                var inputDb = await _messages.FindAsync(m => m.Id == inputMessageId) ?? throw new InvalidOperationException("Input message not found.");
                await WriteAsync(ch, New<TurnCreatedEventDto>(requestId, SessionOperationKind.Chat, seq++, e =>
                {
                    e.SessionId = sessionId;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turnId;
                    e.ExecutionId = executionId;
                    e.TimelineIndex = turn.TimelineIndex;
                }), ct);

                await WriteAsync(ch, New<InputCommittedEventDto>(requestId, SessionOperationKind.Chat, seq++, e =>
                {
                    e.SessionId = sessionId;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turnId;
                    e.ExecutionId = executionId;
                    e.InputMessageId = inputMessageId;
                    e.Input = SessionMappingService.ToDto(inputDb.ToDomain());
                }), ct);

                await WriteAsync(ch, New<ExecutionBeganEventDto>(requestId, SessionOperationKind.Chat, seq++, e =>
                {
                    e.SessionId = sessionId;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turnId;
                    e.ExecutionId = executionId;
                    e.UsingInputIndex = turn.SelectedInputIndex;
                }), ct);

                // 3.5) PRE-STREAM SUMMARY (before any assistant output)
                await GenerateSummaryIfNeededAsync(
                    sessionId: sessionId,
                    timelineId: turn.TimelineId ?? throw new InvalidOperationException("Turn has no timeline."),
                    provider: provider,
                    model: model,
                    forceOnBranch: false,
                    ct: ct);

                // 4) pre-step (tool_call)
                Info("S4: Adding pre-step (tool_call) …");
                var callStep = await _domain.AddStepAsync(turnId, new TurnStep
                {
                    Kind = TurnStepKinds.ToolCall,
                    Payload = new BsonDocument
                {
                    { "event", "chat_completion.request" },
                    { "provider", provider },
                    { "model", model }
                }
                }, ct);

                await WriteAsync(ch, New<StepAppendedEventDto>(requestId, SessionOperationKind.Chat, seq++, e =>
                {
                    e.SessionId = sessionId;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turnId;
                    e.ExecutionId = executionId;
                    e.Step = SessionMappingService.ToDto(callStep);
                }), ct);

                // 5) LLM call (stream or non-stream)
                Info($"S5: Resolving client for provider={provider} model={model} stream={req.Stream}");
                var (client, endpoint, modelCfg, providerCfg) = await _helper.ResolveClientAsync(provider, model, ct);
                var sysReasoning = _helper.GetReasoningSystemText(modelCfg, req.EnableThinking);
                var effectiveSession = new Session { Id = session.Id, Instructions = req.Instructions ?? session.Instructions };

                var chatReq = _helper.BuildChatRequest(effectiveSession, inputDb.ToDomain(), gen, sysReasoning);

                chatReq.SessionId = session.Id;
                chatReq.Messages = await BuildMessagesIncludingHistoryAsync(
                    sessionId: session.Id,
                    timelineId: turn.TimelineId ?? throw new InvalidOperationException("Turn has no timeline."),
                    currentInput: inputDb.ToDomain(),
                    sysReasoning: sysReasoning,
                    ct: ct);

                string finalText;
                if (req.Stream)
                {
                    var sb = new System.Text.StringBuilder();
                    await foreach (var frame in client.StreamChatCompletionAsync(chatReq, endpoint, providerCfg.Name, ct))
                    {
                        foreach (var choice in frame.Choices)
                        {
                            if (choice is StreamingChoice s && !string.IsNullOrEmpty(s.Delta.Content))
                            {
                                var delta = s.Delta.Content!;
                                sb.Append(delta);
                                await WriteAsync(ch, New<OutputDeltaEventDto>(requestId, SessionOperationKind.Chat, seq++, e =>
                                {
                                    e.SessionId = sessionId;
                                    e.TimelineId = turn.TimelineId;
                                    e.TurnId = turnId;
                                    e.ExecutionId = executionId;
                                    e.TextDelta = delta;
                                    e.CumulativeChars = sb.Length;
                                }), ct);
                            }
                        }
                    }
                    finalText = sb.ToString();
                    Info($"S5: Streaming complete, len={finalText.Length}");
                }
                else
                {
                    var chatRes = await client.CreateChatCompletionAsync(chatReq, endpoint, providerCfg.Name, ct);
                    finalText = _helper.ExtractFinalText(chatRes);
                    Info($"S5: Non-stream completion len={finalText.Length}");
                }

                // 6) persist output (force the reserved id)
                Info("S6: Persisting assistant output…");
                var outDto = new SessionMessageDto
                {
                    SessionId = sessionId,
                    SessionTurnId = turnId,
                    Role = AgenticRoles.ASSISTANT,
                    Content = new() { new SessionMessageTextContentDto { Text = finalText } },
                    Provider = providerCfg.Name,
                    Model = model
                };

                var outDomain = SessionMappingService.ToDomain(outDto);
                // IMPORTANT: respect pre-allocated id so FE id == DB id
                outDomain.Id = plannedOutputMessageId;

                var output = await _domain.AttachOutputMessageAsync(sessionId, turnId, outDomain, ct);
                if (output.Id != plannedOutputMessageId)
                    Info($"S6: WARNING output id mismatch. expected={plannedOutputMessageId} actual={output.Id}");

                await WriteAsync(ch, New<OutputCommittedEventDto>(requestId, SessionOperationKind.Chat, seq++, e =>
                {
                    e.SessionId = sessionId;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turnId;
                    e.ExecutionId = executionId;
                    e.OutputMessageId = output.Id; // should equal plannedOutputMessageId
                    e.Output = SessionMappingService.ToDto(output);
                }), ct);
                Info("S6: OutputCommitted written");

                // 7) post-step (tool_result)
                Info("S7: Adding post-step (tool_result) …");
                var resultStep = await _domain.AddStepAsync(turnId, new TurnStep
                {
                    Kind = TurnStepKinds.ToolResult,
                    PreviousStepId = callStep.Id,
                    Payload = new BsonDocument
                {
                    { "event", "chat_completion.response" },
                    { "provider", provider },
                    { "model", model }
                }
                }, ct);

                await WriteAsync(ch, New<StepAppendedEventDto>(requestId, SessionOperationKind.Chat, seq++, e =>
                {
                    e.SessionId = sessionId;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turnId;
                    e.ExecutionId = executionId;
                    e.Step = SessionMappingService.ToDto(resultStep);
                }), ct);

                // 8) completed (+ optional stats)
                Info("S8: Recomputing stats…");
                var stats = await _domain.RecomputeStatsAsync(sessionId, ct);
                Info("S8: Stats recomputed");

                await WriteAsync(ch, New<CompletedEventDto>(requestId, SessionOperationKind.Chat, seq++, e =>
                {
                    e.SessionId = sessionId;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turnId;
                    e.ExecutionId = executionId;
                    e.InputMessageId = inputMessageId;
                    e.OutputMessageId = output.Id; // equals planned
                    e.StepIds = new List<Guid> { callStep.Id, resultStep.Id };
                    e.Stats = SessionMappingService.ToDto(stats);
                    e.IsFinished = true;
                    e.FinishReason = "completed";
                }), ct);
                Info($"END OK reqId={requestId} elapsedMs={sw.Elapsed.TotalMilliseconds:F0}");

                ch.Writer.TryComplete();
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "[SessionStreamingService.Chat] Faulted reqId={ReqId}", requestId);
                Console.WriteLine($"{DateTime.UtcNow:O} [SessionStreamingService.Chat] ERROR reqId={requestId} type={ex.GetType().Name} msg={ex.Message}");
                WriteErrorAndComplete(ch, requestId, SessionOperationKind.Chat, ref seq, "chat_error", ex);
            }
            finally
            {
                sw.Stop();
            }
        }, ct);

        return ch.Reader.ReadAllAsync(ct);
    }


    // Load the persisted history window (TurnIds) and latest summary, or fall back to last N turns
    private async Task<(IReadOnlyList<Guid> windowTurnIds, SessionSummary? latestSummary)>
        GetHistoryWindowAsync(Guid sessionId, Guid timelineId, CancellationToken ct)
    {
        var history = await _histories.FindAsync(h => h.SessionId == sessionId && h.TimelineId == timelineId);
        if (history is not null)
        {
            SessionSummary? latest = null;
            if (history.LatestSessionSummaryId is Guid sid && sid != Guid.Empty)
                latest = await _summaries.FindAsync(s => s.Id == sid);

            // window is persisted: use as-is
            return (history.TurnIds, latest);
        }

        // Fallback: derive last 16 turns from timeline (keeps behavior sane before history is created)
        var timeline = await _timelines.FindAsync(t => t.Id == timelineId)
            ?? throw new InvalidOperationException("Timeline not found.");

        const int fallbackMax = 16;
        var all = timeline.SessionTurnIds ?? new List<Guid>();
        var window = (all.Count <= fallbackMax) ? all : all.Skip(all.Count - fallbackMax).ToList();
        return (window, null);
    }

    // Hydrate selected user/assistant messages for each turn in-order
    private async Task<List<SessionMessage>> HydrateWindowMessagesAsync(IReadOnlyList<Guid> windowTurnIds, CancellationToken ct)
    {
        var result = new List<SessionMessage>();

        foreach (var turnId in windowTurnIds)
        {
            var turn = await _turns.FindAsync(t => t.Id == turnId);
            if (turn is null) continue;

            // chosen input
            Guid? inputId = null;
            if (turn.SelectedInputIndex >= 0 && turn.SelectedInputIndex < turn.InputMessageIds.Count)
                inputId = turn.InputMessageIds[turn.SelectedInputIndex];
            else if (turn.InputMessageIds.Count > 0)
                inputId = turn.InputMessageIds.Last();

            if (inputId.HasValue)
            {
                var inputDb = await _messages.FindAsync(m => m.Id == inputId.Value);
                if (inputDb is not null) result.Add(inputDb.ToDomain());
            }

            // chosen output
            Guid? outId = null;
            if (turn.SelectedOutputIndex >= 0 && turn.SelectedOutputIndex < turn.OutputMessageIds.Count)
                outId = turn.OutputMessageIds[turn.SelectedOutputIndex];
            else if (turn.OutputMessageIds.Count > 0)
                outId = turn.OutputMessageIds.Last();

            if (outId.HasValue)
            {
                var outDb = await _messages.FindAsync(m => m.Id == outId.Value);
                if (outDb is not null) result.Add(outDb.ToDomain());
            }
        }

        return result;
    }

    // Map a domain SessionMessage to one (or more) ChatMessage(s)
    // - If only text parts → single ChatMessage with string content
    // - If multipart (text+images) → single ChatMessage with List<ContentPart>
    // - Files/tools are ignored here; extend as needed for your provider/tooling
    private static List<ChatMessage> ToChatMessages(SessionMessage dm)
    {
        var role = string.Equals(dm.Role, AgenticRoles.ASSISTANT, StringComparison.OrdinalIgnoreCase)
            ? AgenticRoles.ASSISTANT
            : AgenticRoles.USER;

        // Collect supported parts
        var parts = new List<ContentPart>();
        foreach (var c in dm.Content)
        {
            switch (c)
            {
                case SessionMessageTextContent t when !string.IsNullOrEmpty(t.Text):
                    parts.Add(new TextContent { Text = t.Text });
                    break;

                case SessionMessageImageContent img when !string.IsNullOrEmpty(img.Url):
                    parts.Add(new ImageContentPart
                    {
                        ImageUrl = new ImageUrlDetail { Url = img.Url!, Detail = null }
                    });
                    break;

                case SessionMessageJsonContent j when !string.IsNullOrEmpty(j.Json):
                    // emit as text; providers handle JSON fine inline
                    parts.Add(new TextContent { Text = j.Json });
                    break;

                // Tool/File can be projected to text or skipped, depending on your policy
                default:
                    break;
            }
        }

        if (parts.Count == 0)
        {
            // defensive: produce an empty text so provider isn't fed null/empty
            return new List<ChatMessage>
            {
                new ChatMessage { Role = role, Content = "" }
            };
        }

        if (parts.Count == 1 && parts[0] is TextContent singleText)
        {
            // simplest path: plain string content
            return new List<ChatMessage>
            {
                new ChatMessage { Role = role, Content = singleText.Text }
            };
        }

        // multipart (text + images): send as array of ContentPart
        return new List<ChatMessage>
        {
            new ChatMessage { Role = role, Content = parts }
        };
    }

    // Build the final ordered message list: [system reasoning?] [snapshot summary?] [history window] [current input]
    private async Task<List<ChatMessage>> BuildMessagesIncludingHistoryAsync(
        Guid sessionId,
        Guid timelineId,
        SessionMessage currentInput,
        string? sysReasoning,
        CancellationToken ct)
    {
        var (windowTurnIds, latestSummary) = await GetHistoryWindowAsync(sessionId, timelineId, ct);
        var priorMsgs = await HydrateWindowMessagesAsync(windowTurnIds, ct);

        var messages = new List<ChatMessage>(capacity: 8 + priorMsgs.Count);

        // 1) system reasoning (if provided by helper earlier)
        if (!string.IsNullOrWhiteSpace(sysReasoning))
            messages.Add(new ChatMessage { Role = AgenticRoles.SYSTEM, Content = sysReasoning! });

        // 2) latest summary snapshot (if present)
        if (latestSummary is not null && !string.IsNullOrWhiteSpace(latestSummary.Summary))
            messages.Add(new ChatMessage { Role = AgenticRoles.SYSTEM, Content = $"Conversation summary (snapshot):\n{latestSummary.Summary}" });

        // 3) history window (user/assistant)
        foreach (var dm in priorMsgs)
            messages.AddRange(ToChatMessages(dm));

        // 4) current input (user) last
        messages.AddRange(ToChatMessages(currentInput));

        return messages;
    }


    // ============================================================
    // Edit Input (fork/trim + new turn + generate)
    // ============================================================
    public IAsyncEnumerable<SessionStreamEventDto> EditInputAsync(SessionEditChatMessageRequestDto req, CancellationToken ct = default)
    {
        var requestId = req.ClientRequestId ?? Guid.NewGuid().ToString("N");
        var ch = Channel.CreateUnbounded<SessionStreamEventDto>(new UnboundedChannelOptions { SingleReader = true, SingleWriter = true });

        _ = Task.Run(async () =>
        {
            var seq = 0;
            try
            {
                if (!req.SessionId.HasValue) throw new InvalidOperationException("SessionId is required for EditInput.");
                var session = await _sessions.FindAsync(s => s.Id == req.SessionId.Value) ?? throw new InvalidOperationException("Session not found.");

                var baseSettings = ResolveBaseGenSettings(session, req);
                var provider = req.Provider ?? baseSettings?.Text?.Provider ?? "OpenRouter";
                var model = req.Model ?? baseSettings?.Text?.Model ?? "google/gemma-3-4b-it:free";
                var gen = _helper.BuildChatArgs(baseSettings, provider, model, req.Stream, req.EnableThinking);

                await WriteAsync(ch, New<AckEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.Provider = provider;
                    e.Model = model;
                    e.SessionCreated = false;
                }), ct);

                // Fork/trim and open new turn with edited input
                var newInputDomain = SessionMappingService.ToDomain(req.NewInput);
                var (newTurnId, newTimelineId) = await _domain.EditInputAsync(session.Id, req.TurnId, newInputDomain, req.ForkTimeline, ct);
                var newTurn = await _turns.FindAsync(t => t.Id == newTurnId) ?? throw new InvalidOperationException("New turn not found.");
                var newInputId = newTurn.InputMessageIds.Last();
                var newInputDb = await _messages.FindAsync(m => m.Id == newInputId) ?? throw new InvalidOperationException("Edited input not found.");

                await WriteAsync(ch, New<TurnCreatedEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = newTimelineId;
                    e.TurnId = newTurnId;
                    e.ExecutionId = newTurn.CurrentExecutionId;
                    e.TimelineIndex = newTurn.TimelineIndex;
                }), ct);

                await WriteAsync(ch, New<InputCommittedEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = newTimelineId;
                    e.TurnId = newTurnId;
                    e.ExecutionId = newTurn.CurrentExecutionId;
                    e.InputMessageId = newInputId;
                    e.Input = SessionMappingService.ToDto(newInputDb.ToDomain());
                }), ct);

                await WriteAsync(ch, New<TimelineForkedEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.BaseTimelineId = req.TimelineId ?? newTurn.TimelineId!.Value;
                    e.NewTimelineId = newTimelineId;
                    e.DivergenceTurnIndex = newTurn.TimelineIndex;
                }), ct);

                // 3.5) BRANCHING SNAPSHOT for base timeline (force) + pre-stream snapshot for new timeline
                if (req.ForkTimeline == true)
                {
                    var baseTimelineId = req.TimelineId ?? newTurn.TimelineId!.Value; // base of fork
                    await GenerateSummaryIfNeededAsync(
                        sessionId: session.Id,
                        timelineId: baseTimelineId,
                        provider: provider,
                        model: model,
                        forceOnBranch: true,
                        ct: ct);
                }
                await GenerateSummaryIfNeededAsync(
                    sessionId: session.Id,
                    timelineId: newTimelineId,
                    provider: provider,
                    model: model,
                    forceOnBranch: false,
                    ct: ct);

                await WriteAsync(ch, New<ExecutionBeganEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = newTimelineId;
                    e.TurnId = newTurnId;
                    e.ExecutionId = newTurn.CurrentExecutionId;
                    e.UsingInputIndex = newTurn.SelectedInputIndex;
                }), ct);

                // pre-step
                var callStep = await _domain.AddStepAsync(newTurnId, new TurnStep
                {
                    Kind = TurnStepKinds.ToolCall,
                    Payload = new BsonDocument
                    {
                        { "event", "chat_completion.request" },
                        { "provider", provider },
                        { "model", model }
                    }
                }, ct);

                await WriteAsync(ch, New<StepAppendedEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = newTimelineId;
                    e.TurnId = newTurnId;
                    e.ExecutionId = newTurn.CurrentExecutionId;
                    e.Step = SessionMappingService.ToDto(callStep);
                }), ct);

                // LLM
                var (client, endpoint, modelCfg, providerCfg) = await _helper.ResolveClientAsync(provider, model, ct);
                var sysReasoning = _helper.GetReasoningSystemText(modelCfg, req.EnableThinking);
                var effectiveSession = new Session { Id = session.Id, Instructions = req.Instructions ?? session.Instructions };
                var chatReq = _helper.BuildChatRequest(effectiveSession, newInputDb.ToDomain(), gen, sysReasoning);

                string finalText;
                if (req.Stream)
                {
                    var sb = new System.Text.StringBuilder();
                    await foreach (var frame in client.StreamChatCompletionAsync(chatReq, endpoint, providerCfg.Name, ct))
                    {
                        foreach (var choice in frame.Choices)
                        {
                            if (choice is StreamingChoice s && !string.IsNullOrEmpty(s.Delta.Content))
                            {
                                var delta = s.Delta.Content!;
                                sb.Append(delta);
                                await WriteAsync(ch, New<OutputDeltaEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                                {
                                    e.SessionId = session.Id;
                                    e.TimelineId = newTimelineId;
                                    e.TurnId = newTurnId;
                                    e.ExecutionId = newTurn.CurrentExecutionId;
                                    e.TextDelta = delta;
                                    e.CumulativeChars = sb.Length;
                                }), ct);
                            }
                        }
                    }
                    finalText = sb.ToString();
                }
                else
                {
                    var chatRes = await client.CreateChatCompletionAsync(chatReq, endpoint, providerCfg.Name, ct);
                    finalText = _helper.ExtractFinalText(chatRes);
                }

                // persist output
                var outDto = new SessionMessageDto
                {
                    SessionId = session.Id,
                    SessionTurnId = newTurnId,
                    Role = AgenticRoles.ASSISTANT,
                    Content = new() { new SessionMessageTextContentDto { Text = finalText } },
                    Provider = providerCfg.Name,
                    Model = model
                };
                var outDomain = SessionMappingService.ToDomain(outDto);
                var output = await _domain.AttachOutputMessageAsync(session.Id, newTurnId, outDomain, ct);

                await WriteAsync(ch, New<OutputCommittedEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = newTimelineId;
                    e.TurnId = newTurnId;
                    e.ExecutionId = newTurn.CurrentExecutionId;
                    e.OutputMessageId = output.Id;
                    e.Output = SessionMappingService.ToDto(output);
                }), ct);

                // post-step
                var resultStep = await _domain.AddStepAsync(newTurnId, new TurnStep
                {
                    Kind = TurnStepKinds.ToolResult,
                    PreviousStepId = callStep.Id,
                    Payload = new BsonDocument
                    {
                        { "event", "chat_completion.response" },
                        { "provider", provider },
                        { "model", model }
                    }
                }, ct);

                await WriteAsync(ch, New<StepAppendedEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = newTimelineId;
                    e.TurnId = newTurnId;
                    e.ExecutionId = newTurn.CurrentExecutionId;
                    e.Step = SessionMappingService.ToDto(resultStep);
                }), ct);

                var stats = await _domain.RecomputeStatsAsync(session.Id, ct);

                await WriteAsync(ch, New<CompletedEventDto>(requestId, SessionOperationKind.EditInput, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = newTimelineId;
                    e.TurnId = newTurnId;
                    e.ExecutionId = newTurn.CurrentExecutionId;
                    e.InputMessageId = newInputId;
                    e.OutputMessageId = output.Id;
                    e.StepIds = new List<Guid> { callStep.Id, resultStep.Id };
                    e.Stats = SessionMappingService.ToDto(stats);
                    e.IsFinished = true;
                    e.FinishReason = "completed";
                }), ct);

                ch.Writer.TryComplete();
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "[SessionStreamingService.EditInput] Faulted reqId={ReqId}", requestId);
                WriteErrorAndComplete(ch, requestId, SessionOperationKind.EditInput, ref seq, "edit_error", ex);
            }
        }, ct);

        return ch.Reader.ReadAllAsync(ct);
    }

    // ============================================================
    // Regenerate (new execution on existing turn)
    // ============================================================
    public IAsyncEnumerable<SessionStreamEventDto> RegenerateAsync(SessionRegenerateChatMessageRequestDto req, CancellationToken ct = default)
    {
        var requestId = req.ClientRequestId ?? Guid.NewGuid().ToString("N");
        var ch = Channel.CreateUnbounded<SessionStreamEventDto>(new UnboundedChannelOptions { SingleReader = true, SingleWriter = true });

        _ = Task.Run(async () =>
        {
            var seq = 0;
            try
            {
                if (!req.SessionId.HasValue) throw new InvalidOperationException("SessionId is required for Regenerate.");
                var session = await _sessions.FindAsync(s => s.Id == req.SessionId.Value) ?? throw new InvalidOperationException("Session not found.");

                var baseSettings = ResolveBaseGenSettings(session, req);
                var provider = req.Provider ?? baseSettings?.Text?.Provider ?? "OpenRouter";
                var model = req.Model ?? baseSettings?.Text?.Model ?? "google/gemma-3-4b-it:free";
                var gen = _helper.BuildChatArgs(baseSettings, provider, model, req.Stream, req.EnableThinking);

                await WriteAsync(ch, New<AckEventDto>(requestId, SessionOperationKind.Regenerate, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.Provider = provider;
                    e.Model = model;
                    e.SessionCreated = false;
                }), ct);

                // start new execution (optionally switch input selection)
                var inputIndex = req.UseSelectedInput ? (int?)null : req.InputIndex;
                var executionId = await _domain.BeginNewExecutionAsync(session.Id, req.TurnId, inputIndex, ct);

                var turn = await _turns.FindAsync(t => t.Id == req.TurnId) ?? throw new InvalidOperationException("Turn not found.");

                await WriteAsync(ch, New<ExecutionBeganEventDto>(requestId, SessionOperationKind.Regenerate, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turn.Id;
                    e.ExecutionId = executionId;
                    e.UsingInputIndex = turn.SelectedInputIndex;
                }), ct);

                var inputMessageId = turn.InputMessageIds[turn.SelectedInputIndex];
                var inputDb = await _messages.FindAsync(m => m.Id == inputMessageId) ?? throw new InvalidOperationException("Input message not found.");

                // PRE-STREAM SUMMARY (before any assistant output)
                await GenerateSummaryIfNeededAsync(
                    sessionId: session.Id,
                    timelineId: turn.TimelineId ?? throw new InvalidOperationException("Turn has no timeline."),
                    provider: provider,
                    model: model,
                    forceOnBranch: false,
                    ct: ct);

                // pre-step
                var callStep = await _domain.AddStepAsync(turn.Id, new TurnStep
                {
                    Kind = TurnStepKinds.ToolCall,
                    Payload = new BsonDocument
                    {
                        { "event", "chat_completion.request" },
                        { "provider", provider },
                        { "model", model }
                    }
                }, ct);

                await WriteAsync(ch, New<StepAppendedEventDto>(requestId, SessionOperationKind.Regenerate, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turn.Id;
                    e.ExecutionId = executionId;
                    e.Step = SessionMappingService.ToDto(callStep);
                }), ct);

                // LLM
                var (client, endpoint, modelCfg, providerCfg) = await _helper.ResolveClientAsync(provider, model, ct);
                var sysReasoning = _helper.GetReasoningSystemText(modelCfg, req.EnableThinking);
                var effectiveSession = new Session { Id = session.Id, Instructions = req.Instructions ?? session.Instructions };
                var chatReq = _helper.BuildChatRequest(effectiveSession, inputDb.ToDomain(), gen, sysReasoning);

                string finalText;
                if (req.Stream)
                {
                    var sb = new System.Text.StringBuilder();
                    await foreach (var frame in client.StreamChatCompletionAsync(chatReq, endpoint, providerCfg.Name, ct))
                    {
                        foreach (var choice in frame.Choices)
                        {
                            if (choice is StreamingChoice s && !string.IsNullOrEmpty(s.Delta.Content))
                            {
                                var delta = s.Delta.Content!;
                                sb.Append(delta);
                                await WriteAsync(ch, New<OutputDeltaEventDto>(requestId, SessionOperationKind.Regenerate, seq++, e =>
                                {
                                    e.SessionId = session.Id;
                                    e.TimelineId = turn.TimelineId;
                                    e.TurnId = turn.Id;
                                    e.ExecutionId = executionId;
                                    e.TextDelta = delta;
                                    e.CumulativeChars = sb.Length;
                                }), ct);
                            }
                        }
                    }
                    finalText = sb.ToString();
                }
                else
                {
                    var chatRes = await client.CreateChatCompletionAsync(chatReq, endpoint, providerCfg.Name, ct);
                    finalText = _helper.ExtractFinalText(chatRes);
                }

                // persist output
                var outDto = new SessionMessageDto
                {
                    SessionId = session.Id,
                    SessionTurnId = turn.Id,
                    Role = AgenticRoles.ASSISTANT,
                    Content = new() { new SessionMessageTextContentDto { Text = finalText } },
                    Provider = providerCfg.Name,
                    Model = model
                };
                var outDomain = SessionMappingService.ToDomain(outDto);
                var output = await _domain.AttachOutputMessageAsync(session.Id, turn.Id, outDomain, ct);

                await WriteAsync(ch, New<OutputCommittedEventDto>(requestId, SessionOperationKind.Regenerate, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turn.Id;
                    e.ExecutionId = executionId;
                    e.OutputMessageId = output.Id;
                    e.Output = SessionMappingService.ToDto(output);
                }), ct);

                // post-step
                var resultStep = await _domain.AddStepAsync(turn.Id, new TurnStep
                {
                    Kind = TurnStepKinds.ToolResult,
                    PreviousStepId = callStep.Id,
                    Payload = new BsonDocument
                    {
                        { "event", "chat_completion.response" },
                        { "provider", provider },
                        { "model", model }
                    }
                }, ct);

                await WriteAsync(ch, New<StepAppendedEventDto>(requestId, SessionOperationKind.Regenerate, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turn.Id;
                    e.ExecutionId = executionId;
                    e.Step = SessionMappingService.ToDto(resultStep);
                }), ct);

                var stats = await _domain.RecomputeStatsAsync(session.Id, ct);

                await WriteAsync(ch, New<CompletedEventDto>(requestId, SessionOperationKind.Regenerate, seq++, e =>
                {
                    e.SessionId = session.Id;
                    e.TimelineId = turn.TimelineId;
                    e.TurnId = turn.Id;
                    e.ExecutionId = executionId;
                    e.InputMessageId = inputMessageId;
                    e.OutputMessageId = output.Id;
                    e.StepIds = new List<Guid> { callStep.Id, resultStep.Id };
                    e.Stats = SessionMappingService.ToDto(stats);
                    e.IsFinished = true;
                    e.FinishReason = "completed";
                }), ct);

                ch.Writer.TryComplete();
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "[SessionStreamingService.Regenerate] Faulted reqId={ReqId}", requestId);
                WriteErrorAndComplete(ch, requestId, SessionOperationKind.Regenerate, ref seq, "regenerate_error", ex);
            }
        }, ct);

        return ch.Reader.ReadAllAsync(ct);
    }

    // ============================================================
    // helpers
    // ============================================================
    private static T New<T>(string requestId, SessionOperationKind op, int sequence, Action<T> fill)
        where T : SessionStreamEventDto, new()
    {
        var dto = new T
        {
            RequestId = requestId,
            Operation = op,
            Sequence = sequence,
            ServerTimeUtc = DateTime.UtcNow,
            IsFinished = false
        };
        fill(dto);
        return dto;
    }

    private static async Task WriteAsync(Channel<SessionStreamEventDto> ch, SessionStreamEventDto evt, CancellationToken ct)
    {
        if (!ch.Writer.TryWrite(evt))
            await ch.Writer.WriteAsync(evt, ct);
    }

    private static void WriteErrorAndComplete(Channel<SessionStreamEventDto> ch, string requestId, SessionOperationKind op, ref int seq, string code, Exception ex)
    {
        var err = new ErrorEventDto
        {
            RequestId = requestId,
            Operation = op,
            Sequence = seq++,
            ServerTimeUtc = DateTime.UtcNow,
            Code = code,
            Message = ex.Message,
            Details = new Dictionary<string, object?>
            {
                ["type"] = ex.GetType().Name,
                ["stack"] = ex.StackTrace ?? ""
            }!.ToDictionary(k => k.Key, k => (object)k.Value!),
            IsFinished = true,
            FinishReason = "faulted"
        };
        ch.Writer.TryWrite(err);
        ch.Writer.TryComplete();
    }

    private static GenerationSettings? ResolveBaseGenSettings(
        Session? session,
        SessionAssistantRequestDto req)
    {
        return req.GenerationSettings ?? session?.Settings?.GenerationSettings;
    }

    // ======================= Summary Helpers =============================

    private async Task GenerateSummaryIfNeededAsync(
        Guid sessionId,
        Guid timelineId,
        string provider,
        string model,
        bool forceOnBranch,
        CancellationToken ct)
    {
        var history = await _histories.EnsureForTimelineAsync(sessionId, timelineId);
        var timeline = await _timelines.FindAsync(t => t.Id == timelineId)
                       ?? throw new InvalidOperationException("Timeline not found.");

        await RefreshHistoryWindowAsync(history, timeline, ct);

        if (!ShouldSummarize(history, forceOnBranch))
            return;

        var (coveredTurns, plainText, fromIdx, toIdx) = await CollectTimelineTextAsync(history, timeline, ct);
        if (string.IsNullOrWhiteSpace(plainText))
            return;

        // Fetch session + base settings for request shaping
        var session = await _sessions.FindAsync(s => s.Id == sessionId)
                      ?? throw new InvalidOperationException("Session not found.");
        var baseSettings = session.Settings?.GenerationSettings;
        var gen = _helper.BuildChatArgs(baseSettings, provider, model, stream: false, enableThinking: false);

        var (client, endpoint, modelCfg, providerCfg) = await _helper.ResolveClientAsync(provider, model, ct);

        var system = "Summarize the conversation to date. Provide 5–8 concise sentences covering: goals, key facts, decisions made, open questions, and next steps. Plain text only.";
        var chatReq = BuildSummaryRequest(session, system, plainText, gen);

        var chatRes = await client.CreateChatCompletionAsync(chatReq, endpoint, providerCfg.Name, ct);
        var summaryText = _helper.ExtractFinalText(chatRes);

        var snapshot = new SessionSummary
        {
            SessionId = sessionId,
            TimelineId = timelineId,
            FromTurnIndex = fromIdx,
            ToTurnIndex = toIdx,
            TurnCount = Math.Max(0, toIdx - fromIdx + 1),
            TurnIds = coveredTurns,
            Provider = providerCfg.Name,
            Model = model,
            Settings = null,
            Usage = null,
            Cost = null,
            Summary = summaryText,
            SummarizedAt = DateTime.UtcNow
        };

        snapshot = await _summaries.AddAsync(snapshot);

        history.LatestSessionSummaryId = snapshot.Id;
        history.SessionSummaryIds.Add(snapshot.Id);
        history.RegisterProviderModel(providerCfg.Name, model);
        await _histories.UpdateAsync(h => h.Id == history.Id, history);
    }

    private static bool ShouldSummarize(SessionHistory history, bool forceOnBranch)
    {
        if (forceOnBranch) return true;

        var noSnapshot = history.LatestSessionSummaryId == null;
        var windowExceeds = history.TurnIds.Count >= history.MaxWindowTurns;

        // If SummarizeEveryNMessages is configured, use it as a soft trigger.
        var messagesThreshold = history.SummarizeEveryNMessages > 0
            ? history.TotalMessages >= history.SummarizeEveryNMessages
            : false;

        return noSnapshot || windowExceeds || messagesThreshold;
    }

    private async Task RefreshHistoryWindowAsync(SessionHistory history, SessionTimeline timeline, CancellationToken ct)
    {
        history.SessionId = timeline.SessionId;
        history.TimelineId = timeline.Id;

        var allTurnIds = timeline.SessionTurnIds ?? new List<Guid>();
        var max = Math.Max(1, history.MaxWindowTurns);
        var window = (allTurnIds.Count <= max)
            ? allTurnIds
            : allTurnIds.GetRange(allTurnIds.Count - max, max);

        history.TurnIds = window;
        history.OnWindowChanged();

        var turns = await _turns.FindAllAsync(t => window.Contains(t.Id));
        var msgCount = 0;
        foreach (var t in turns)
        {
            msgCount += (t.InputMessageIds?.Count ?? 0) + (t.OutputMessageIds?.Count ?? 0);
        }

        history.TotalTurns = allTurnIds.Count;
        history.TotalMessages = msgCount;

        await _histories.UpdateAsync(h => h.Id == history.Id, history);
    }

    private async Task<(List<Guid> coveredTurnIds, string text, int fromIdx, int toIdx)>
        CollectTimelineTextAsync(SessionHistory history, SessionTimeline timeline, CancellationToken ct)
    {
        var coveredIds = history.TurnIds?.ToList() ?? new List<Guid>();
        if (coveredIds.Count == 0)
            return (coveredIds, string.Empty, 0, -1);

        var turns = (await _turns.FindAllAsync(t => coveredIds.Contains(t.Id)))
                        .OrderBy(t => t.TimelineIndex)
                        .ToList();

        if (turns.Count == 0)
            return (coveredIds, string.Empty, 0, -1);

        var fromIdx = turns.First().TimelineIndex;
        var toIdx = turns.Last().TimelineIndex;

        var sb = new System.Text.StringBuilder();
        const int charCap = 8000; // heuristic; can be mapped from token cap

        foreach (var turn in turns)
        {
            // input first
            foreach (var mid in turn.InputMessageIds ?? Enumerable.Empty<Guid>())
            {
                var m = await _messages.FindAsync(x => x.Id == mid);
                if (m != null) AppendTextFromContent("user", m.Content, sb, charCap);
                if (sb.Length > charCap) break;
            }
            if (sb.Length > charCap) break;

            // then outputs
            foreach (var mid in turn.OutputMessageIds ?? Enumerable.Empty<Guid>())
            {
                var m = await _messages.FindAsync(x => x.Id == mid);
                if (m != null) AppendTextFromContent("assistant", m.Content, sb, charCap);
                if (sb.Length > charCap) break;
            }
            if (sb.Length > charCap) break;
        }

        return (coveredIds, sb.ToString(), fromIdx, toIdx);

        static void AppendTextFromContent(string role, List<BsonDocument> content, System.Text.StringBuilder sb, int cap)
        {
            if (content == null) return;
            foreach (var c in content)
            {
                if (c.TryGetValue("type", out var t) && t.IsString && t.AsString == "text")
                {
                    if (c.TryGetValue("text", out var textVal) && textVal.IsString)
                    {
                        var text = textVal.AsString;
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            var line = $"{role}: {text}\n";
                            var remaining = cap - sb.Length;
                            if (remaining <= 0) return;
                            if (line.Length > remaining) line = line[..remaining];
                            sb.Append(line);
                        }
                    }
                }
            }
        }
    }

    /// <summary>
    /// Builds a lightweight chat request for summarization, reusing the same request pipeline
    /// used for normal chat. It constructs a synthetic "user" message with the collected text.
    /// </summary>
    private ChatRequest BuildSummaryRequest(
        Session session,
        string systemPrompt,
        string conversationPlainText,
        ChatGenerationArgs gen)
    {
        // Construct a synthetic user message containing the conversation text
        var summaryInputDto = new SessionMessageDto
        {
            SessionId = session.Id,
            Role = AgenticRoles.USER,
            Content = new() { new SessionMessageTextContentDto { Text = conversationPlainText } }
        };

        var summaryInputDomain = SessionMappingService.ToDomain(summaryInputDto);

        // Some helper variants accept explicit system text; if your BuildChatRequest already
        // incorporates system prompts via _helper.GetReasoningSystemText or settings, pass systemPrompt there.
        return _helper.BuildChatRequest(
            new Session { Id = session.Id, Instructions = $"{session.Instructions}\n\n{systemPrompt}".Trim() },
            summaryInputDomain,
            gen,
            sysReasoning: null // keep default; systemPrompt is injected in Instructions above
        );
    }
}
