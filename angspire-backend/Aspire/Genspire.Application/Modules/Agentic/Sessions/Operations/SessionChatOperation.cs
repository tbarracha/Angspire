// File: Genspire/Application/Modules/Agentic/Sessions/Operations/SessionChatOperation.cs
using System;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using Genspire.Application.Modules.Agentic.Sessions.Contracts;
using Genspire.Application.Modules.Agentic.Sessions.Contracts.Dtos;
using Genspire.Application.Modules.Agentic.Sessions.Domain.Services;
using Microsoft.Extensions.Logging;
using SpireCore.API.Operations.Attributes;
using SpireCore.API.Operations.Streaming;
using SpireCore.API.Operations.WebSockets;

namespace Genspire.Application.Modules.Agentic.Sessions.Operations;

[OperationRoute("session/chat")]
public sealed class SessionChatOperation : WebSocketStreamableOperationBase<SessionChatRequestDto, SessionStreamEventDto>
{
    private readonly ILogger<SessionChatOperation> _log;
    private readonly ISessionStreamingService _streaming;

    public SessionChatOperation(
        IStreamAbortRegistry abortRegistry,
        ILogger<SessionChatOperation> log,
        ISessionStreamingService streaming
    ) : base(abortRegistry)
    {
        _log = log;
        _streaming = streaming;
    }

    protected override async IAsyncEnumerable<SessionStreamEventDto> ExecuteStreamAsync(
        SessionChatRequestDto req,
        string requestId,
        int nextSequence,
        [EnumeratorCancellation] CancellationToken ct)
    {
        // Preserve correlation id
        req.ClientRequestId ??= requestId;

        var sw = Stopwatch.StartNew();
        var frames = 0;

        // ---- BEGIN ----
        _log.LogInformation("[SessionChatOperation] BEGIN stream | reqId={RequestId}", requestId);
        Console.WriteLine($"{DateTime.UtcNow:O} [SessionChatOperation] BEGIN stream | reqId={requestId}");

        var source = _streaming.ChatAsync(req, ct);

        await using var e = source.WithCancellation(ct).GetAsyncEnumerator();

        try
        {
            while (true)
            {
                bool moved;
                try
                {
                    // Any exceptions during enumeration are logged here.
                    moved = await e.MoveNextAsync();
                }
                catch (Exception ex)
                {
                    // ---- ERROR ----
                    _log.LogError(ex, "[SessionChatOperation] ERROR during stream | reqId={RequestId}", requestId);
                    Console.WriteLine($"{DateTime.UtcNow:O} [SessionChatOperation] ERROR during stream | reqId={requestId} {ex}");
                    throw;
                }

                if (!moved) break;

                frames++;
                yield return e.Current; // <-- no try/catch surrounds this yield
            }
        }
        finally
        {
            sw.Stop();
            // ---- END ----
            _log.LogInformation(
                "[SessionChatOperation] END stream | reqId={RequestId} frames={Frames} elapsed={Elapsed}ms",
                requestId, frames, sw.Elapsed.TotalMilliseconds);

            Console.WriteLine(
                $"{DateTime.UtcNow:O} [SessionChatOperation] END stream | reqId={requestId} frames={frames} elapsed={sw.Elapsed.TotalMilliseconds:F0}ms");
        }
    }
}
