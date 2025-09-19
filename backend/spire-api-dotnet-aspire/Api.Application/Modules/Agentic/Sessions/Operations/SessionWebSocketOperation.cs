// File: Genspire/Application/Modules/Agentic/Sessions/Operations/SessionWebSocketOperation.cs

using System;
using System.Text.Json;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using SpireCore.API.JWT.Identity;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Streaming;
using SpireCore.API.Operations.WebSockets;
using Genspire.Application.Modules.Agentic.Sessions.Contracts.Dtos;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Services;

namespace Genspire.Application.Modules.Agentic.Sessions.Operations;

/* ============================================================
 * Event names (top of operation context)
 * ============================================================ */
public static class SessionWsEvents
{
    public const string ChatBegin = "chat_begin";
    public const string ChatFrame = "chat_frame"; // tighten if you add a discriminant on frames
    public const string ChatEnd = "chat_end";
    public const string ChatCancelAck = "chat_cancel_ack";
}

/* ============================================================
 * Start DTOs (before operation)
 * ============================================================ */

/// <summary>Session-scoped base start payload. Inherits Route/UserId/AuthToken/CoalesceKey from WsStartDto.</summary>
public class SessionStartDto : WsStartDto
{
    public Guid? SessionId { get; set; }
}

/// <summary>Start a chat stream on a session.</summary>
public sealed class SessionChatStartDto : SessionStartDto
{
    public required string Provider { get; set; }
    public required string Model { get; set; }
    public string? Instructions { get; set; }
    public bool Stream { get; set; } = true;
    public string? ClientRequestId { get; set; }
}

/// <summary>Cancel a running chat stream (requires server-issued requestId).</summary>
public sealed class SessionChatStopStartDto : SessionStartDto
{
    public required string TargetRequestId { get; set; }
}

/* ============================================================
 * Operation: core router + chat handlers (monolithic)
 * ============================================================ */

[OperationRoute("session/connect")]
public sealed class SessionWebSocketOperation
    : WebSocketOperationBase<SessionStartDto>
{
    private readonly ISessionStreamingService _streaming;
    private readonly IStreamAbortRegistry _abortRegistry; // for route-based cancel
    private readonly JsonSerializerOptions _json;

    public SessionWebSocketOperation(
        IStreamAbortRegistry registry,
        IJwtIdentityService jwt,
        ILoggerFactory loggerFactory,
        ISessionStreamingService streaming
    ) : base(registry, jwt, loggerFactory)
    {
        _streaming = streaming;
        _abortRegistry = registry;
        _json = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
    }

    // Prefer coalescing by Route:SessionId when available; otherwise fall back to base behavior.
    protected override string? GetCoalesceKey(SessionStartDto start)
        => start.SessionId is Guid sid
            ? $"{start.Route?.Trim().ToLowerInvariant()}:{sid:N}"
            : base.GetCoalesceKey(start);

    protected override async IAsyncEnumerable<WsEnvelope> OnStartedAsync(
        SessionStartDto start,
        string requestId,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var route = start.Route.Trim().ToLowerInvariant();
        _log.LogInformation("WS start route={Route} userId={UserId} sessionId={SessionId} reqId={ReqId}",
            route, start.UserId, start.SessionId, requestId);

        switch (route)
        {
            case "session/chat/stream":
                {
                    if (!TryRebind(start, out SessionChatStartDto? dto, out var err))
                    { yield return err!; yield break; }

                    await foreach (var e in HandleSessionChatStream(dto!, requestId, ct)) yield return e;
                    yield break;
                }

            case "session/chat/stop":
                {
                    if (!TryRebind(start, out SessionChatStopStartDto? dto, out var err))
                    { yield return err!; yield break; }

                    await foreach (var e in HandleSessionChatStop(dto!, requestId, ct)) yield return e;
                    yield break;
                }

            default:
                yield return WsEnvelopeBuilder.Error("unsupported_route", $"Unsupported route '{start.Route}'.", requestId);
                yield break;
        }
    }

    /* -----------------------
     * Chat handlers
     * --------------------- */

    private async IAsyncEnumerable<WsEnvelope> HandleSessionChatStream(
        SessionChatStartDto dto,
        string requestId,
        [EnumeratorCancellation] CancellationToken ct)
    {
        // Bootstrap for FE binding
        yield return WsEnvelopeBuilder.Event(SessionWsEvents.ChatBegin, new
        {
            sessionId = dto.SessionId,
            provider = dto.Provider,
            model = dto.Model,
            clientRequestId = dto.ClientRequestId ?? requestId
        }, requestId);

        // Bridge domain streaming service
        var req = new SessionChatRequestDto
        {
            SessionId = dto.SessionId,
            Provider = dto.Provider,
            Model = dto.Model,
            Instructions = dto.Instructions,
            Stream = dto.Stream,
            ClientRequestId = dto.ClientRequestId ?? requestId
        };

        await foreach (var frame in _streaming.ChatAsync(req, ct).WithCancellation(ct))
        {
            yield return WsEnvelopeBuilder.Event(MapFrameType(frame), frame, requestId);
        }

        yield return WsEnvelopeBuilder.Event(SessionWsEvents.ChatEnd, new { requestId }, requestId);
    }

    private async IAsyncEnumerable<WsEnvelope> HandleSessionChatStop(
        SessionChatStopStartDto dto,
        string requestId,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var ok = !string.IsNullOrWhiteSpace(dto.TargetRequestId) && _abortRegistry.Cancel(dto.TargetRequestId);

        yield return ok
            ? WsEnvelopeBuilder.Event(SessionWsEvents.ChatCancelAck, new { target = dto.TargetRequestId }, requestId)
            : WsEnvelopeBuilder.Error("not_found", $"No running request with id '{dto.TargetRequestId}'.", requestId);

        await Task.CompletedTask;
    }

    /* -----------------------
     * Utilities
     * --------------------- */

    // No new() constraint → supports 'required' members on derived start DTOs.
    private bool TryRebind<T>(SessionStartDto baseDto, out T? dto, out WsEnvelope? error)
        where T : SessionStartDto
    {
        if (baseDto is T typed)
        {
            dto = typed; error = null; return true;
        }

        try
        {
            var json = JsonSerializer.Serialize(baseDto, _json);
            dto = JsonSerializer.Deserialize<T>(json, _json);
            if (dto is null)
            {
                error = WsEnvelopeBuilder.Error("invalid_start", $"Failed to parse {typeof(T).Name}.");
                return false;
            }
            error = null;
            return true;
        }
        catch (Exception ex)
        {
            error = WsEnvelopeBuilder.Error("invalid_start", $"Failed to parse {typeof(T).Name}.", new { ex.Message });
            dto = null;
            return false;
        }
    }

    // Tighten this once you expose a discriminant on SessionStreamEventDto.
    private static string MapFrameType(SessionStreamEventDto frame) => SessionWsEvents.ChatFrame;
}
